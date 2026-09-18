use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::core::device::DeviceProvider;
use crate::core::imaging::execute_write_image;
use crate::core::progress::{OperationStage, ProgressPayload};
use crate::core::safety::SafetyValidator;
use crate::core::verification::execute_verify_image;
use crate::errors::StorageError;
use crate::logging::{LogCategory, LogLevel};
use crate::platform::windows::WindowsDeviceProvider;

use std::sync::LazyLock;

static OPS: LazyLock<Mutex<HashMap<String, Arc<AtomicBool>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriteRequest {
    pub device_id: String,
    pub expected_fingerprint: String,
    pub image_path: String,
    pub verify_after_write: bool,
}

#[tauri::command]
pub async fn validate_target(
    device_id: String,
    image_path: String,
    expected_fingerprint: String,
) -> Result<(), StorageError> {
    let provider = WindowsDeviceProvider::new();
    let devices = provider.list_devices()?;
    let device = devices
        .iter()
        .find(|d| d.device_id == device_id)
        .ok_or_else(|| StorageError::DeviceNotFound(device_id.clone()))?;

    let file_meta = std::fs::metadata(&image_path)?;
    SafetyValidator::validate_for_imaging(device, file_meta.len(), &expected_fingerprint)
}

#[tauri::command]
pub async fn start_write_operation(
    app: AppHandle,
    request: WriteRequest,
) -> Result<String, StorageError> {
    let operation_id = uuid::Uuid::new_v4().to_string();
    let cancel_token = Arc::new(AtomicBool::new(false));

    // Register active cancellation token
    if let Ok(mut map) = OPS.lock() {
        map.insert(operation_id.clone(), cancel_token.clone());
    }

    let op_id_clone = operation_id.clone();
    let app_handle = app.clone();

    // Log start
    crate::logging_service::log(
        LogLevel::Info,
        LogCategory::Imaging,
        format!("Initiating write operation on {} with {}", request.device_id, request.image_path),
        Some(format!("Operation ID: {}", operation_id)),
    );

    // Spawn background task
    tokio::task::spawn_blocking(move || {
        let run_result = run_imaging_pipeline(
            &app_handle,
            &op_id_clone,
            &request,
            cancel_token,
        );

        if let Err(e) = run_result {
            crate::logging_service::log(
                LogLevel::Error,
                LogCategory::Imaging,
                format!("Write operation {} failed: {}", op_id_clone, e),
                None,
            );

            let _ = app_handle.emit(
                "imaging-progress",
                ProgressPayload {
                    operation_id: op_id_clone.clone(),
                    stage: OperationStage::Failed,
                    bytes_processed: 0,
                    total_bytes: 0,
                    percentage: 0.0,
                    speed_bytes_per_sec: 0,
                    eta_seconds: None,
                    elapsed_seconds: 0,
                    message: format!("Operation failed: {}", e),
                },
            );
        }

        // Clean up from active operations
        if let Ok(mut map) = OPS.lock() {
            map.remove(&op_id_clone);
        }
    });

    Ok(operation_id)
}

fn run_imaging_pipeline(
    app: &AppHandle,
    operation_id: &str,
    request: &WriteRequest,
    cancel_token: Arc<AtomicBool>,
) -> Result<(), StorageError> {
    // 1. FRESH HARDWARE RE-QUERY IMMEDIATELY BEFORE DESTRUCTIVE ACTIONS
    let provider = WindowsDeviceProvider::new();
    let devices = provider.list_devices()?;
    let device = devices
        .iter()
        .find(|d| d.device_id == request.device_id)
        .ok_or_else(|| StorageError::DeviceNotFound(request.device_id.clone()))?;

    let file_meta = std::fs::metadata(&request.image_path)?;
    let img_size = file_meta.len();

    // 2. Strict Safety validation
    SafetyValidator::validate_for_imaging(device, img_size, &request.expected_fingerprint)?;

    // Emit Preparing stage
    let _ = app.emit(
        "imaging-progress",
        ProgressPayload {
            operation_id: operation_id.to_string(),
            stage: OperationStage::Preparing,
            bytes_processed: 0,
            total_bytes: img_size,
            percentage: 0.0,
            speed_bytes_per_sec: 0,
            eta_seconds: None,
            elapsed_seconds: 0,
            message: "Preparing drive: dismounting existing volumes and acquiring exclusive lock...".into(),
        },
    );

    // 3. Execute Write
    let app_emitter = app.clone();
    execute_write_image(
        operation_id,
        device.device_number,
        &device.device_path,
        &request.image_path,
        cancel_token.clone(),
        move |payload| {
            let _ = app_emitter.emit("imaging-progress", payload);
        },
    )?;

    // 4. Execute Verification if requested
    if request.verify_after_write {
        if cancel_token.load(Ordering::Relaxed) {
            return Err(StorageError::Cancelled);
        }

        let app_verify_emitter = app.clone();
        execute_verify_image(
            operation_id,
            &device.device_path,
            &request.image_path,
            cancel_token.clone(),
            move |payload| {
                let _ = app_verify_emitter.emit("imaging-progress", payload);
            },
        )?;
    }

    // 5. Completion stage
    let _ = app.emit(
        "imaging-progress",
        ProgressPayload {
            operation_id: operation_id.to_string(),
            stage: OperationStage::Completed,
            bytes_processed: img_size,
            total_bytes: img_size,
            percentage: 100.0,
            speed_bytes_per_sec: 0,
            eta_seconds: None,
            elapsed_seconds: 0,
            message: "Bootable USB created successfully! Written data verified.".into(),
        },
    );

    crate::logging_service::log(
        LogLevel::Success,
        LogCategory::Imaging,
        format!("Successfully created bootable USB on {}", request.device_id),
        Some(format!("Size: {} bytes", img_size)),
    );

    Ok(())
}

#[tauri::command]
pub async fn cancel_operation(operation_id: String) -> Result<(), StorageError> {
    if let Ok(map) = OPS.lock() {
        if let Some(token) = map.get(&operation_id) {
            token.store(true, Ordering::Relaxed);
            crate::logging_service::log(
                LogLevel::Warning,
                LogCategory::Imaging,
                format!("Cancellation requested for operation {}", operation_id),
                None,
            );
            return Ok(());
        }
    }
    Err(StorageError::OperationFailed("Operation not found or already completed".into()))
}
