use serde::{Deserialize, Serialize};
use crate::errors::StorageError;
use crate::logging::ActivityEntry;
use crate::security::is_elevated;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os_name: String,
    pub is_elevated: bool,
    pub app_version: String,
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, StorageError> {
    Ok(SystemInfo {
        os_name: "Windows 11 / 10 64-bit".into(),
        is_elevated: is_elevated(),
        app_version: "0.1.0".into(),
    })
}

#[tauri::command]
pub async fn get_activity_logs() -> Result<Vec<ActivityEntry>, StorageError> {
    Ok(crate::logging_service::get_logs())
}

#[tauri::command]
pub async fn clear_activity_logs() -> Result<(), StorageError> {
    crate::logging_service::clear_logs();
    Ok(())
}
