use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use crate::errors::StorageError;

pub fn compute_sha256_streaming<P: AsRef<Path>, F: Fn(u64, u64)>(
    path: P,
    cancellation_token: Option<Arc<AtomicBool>>,
    progress_callback: Option<F>,
) -> Result<String, StorageError> {
    let mut file = File::open(path)?;
    let total_len = file.metadata()?.len();

    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 2 * 1024 * 1024]; // 2MB streaming buffer
    let mut processed: u64 = 0;

    loop {
        if let Some(ref cancel) = cancellation_token {
            if cancel.load(Ordering::Relaxed) {
                return Err(StorageError::Cancelled);
            }
        }

        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }

        hasher.update(&buffer[..n]);
        processed += n as u64;

        if let Some(ref cb) = progress_callback {
            cb(processed, total_len);
        }
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}
