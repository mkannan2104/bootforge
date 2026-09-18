use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use crate::core::progress::{OperationStage, ProgressPayload, SpeedTracker};
use crate::errors::StorageError;
use crate::platform::windows::storage::stream_write_image;
use crate::platform::windows::volume::lock_and_dismount_device_volumes;

pub fn execute_write_image<P: AsRef<Path>, F: FnMut(ProgressPayload)>(
    operation_id: &str,
    device_number: u32,
    device_path: &str,
    image_path: P,
    cancellation_token: Arc<AtomicBool>,
    mut progress_callback: F,
) -> Result<(), StorageError> {
    // 1. Lock and dismount target volumes on the disk
    let _lock_guard = lock_and_dismount_device_volumes(device_number)?;

    let mut speed_tracker = SpeedTracker::new();
    let op_id = operation_id.to_string();

    // 2. Stream write
    stream_write_image(
        image_path,
        device_path,
        cancellation_token.clone(),
        |written, total| {
            speed_tracker.record_progress(written);
            let speed = speed_tracker.calculate_speed();
            let eta = speed_tracker.calculate_eta(total, written);
            let pct = if total > 0 {
                (written as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            progress_callback(ProgressPayload {
                operation_id: op_id.clone(),
                stage: OperationStage::Writing,
                bytes_processed: written,
                total_bytes: total,
                percentage: pct,
                speed_bytes_per_sec: speed,
                eta_seconds: eta,
                elapsed_seconds: speed_tracker.elapsed_secs(),
                message: format!("Writing image: {:.1}%", pct),
            });
        },
    )?;

    // 3. Flushing stage notification
    progress_callback(ProgressPayload {
        operation_id: operation_id.to_string(),
        stage: OperationStage::Flushing,
        bytes_processed: 0,
        total_bytes: 0,
        percentage: 100.0,
        speed_bytes_per_sec: 0,
        eta_seconds: None,
        elapsed_seconds: speed_tracker.elapsed_secs(),
        message: "Flushing buffers to physical storage...".into(),
    });

    Ok(())
}
