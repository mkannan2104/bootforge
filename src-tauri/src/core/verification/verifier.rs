use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use crate::core::progress::{OperationStage, ProgressPayload, SpeedTracker};
use crate::errors::StorageError;
use crate::platform::windows::storage::stream_verify_image;

pub fn execute_verify_image<P: AsRef<Path>, F: FnMut(ProgressPayload)>(
    operation_id: &str,
    device_path: &str,
    image_path: P,
    cancellation_token: Arc<AtomicBool>,
    mut progress_callback: F,
) -> Result<(), StorageError> {
    let mut speed_tracker = SpeedTracker::new();
    let op_id = operation_id.to_string();

    stream_verify_image(
        image_path,
        device_path,
        cancellation_token,
        |verified, total| {
            speed_tracker.record_progress(verified);
            let speed = speed_tracker.calculate_speed();
            let eta = speed_tracker.calculate_eta(total, verified);
            let pct = if total > 0 {
                (verified as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            progress_callback(ProgressPayload {
                operation_id: op_id.clone(),
                stage: OperationStage::Verifying,
                bytes_processed: verified,
                total_bytes: total,
                percentage: pct,
                speed_bytes_per_sec: speed,
                eta_seconds: eta,
                elapsed_seconds: speed_tracker.elapsed_secs(),
                message: format!("Verifying written data: {:.1}%", pct),
            });
        },
    )?;

    Ok(())
}
