use crate::core::device::{DeviceDetails, DeviceInfo, DeviceProvider};
use crate::errors::StorageError;
use crate::platform::windows::WindowsDeviceProvider;

#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceInfo>, StorageError> {
    let provider = WindowsDeviceProvider::new();
    provider.list_devices()
}

#[tauri::command]
pub async fn get_device_details(device_id: String) -> Result<DeviceDetails, StorageError> {
    let provider = WindowsDeviceProvider::new();
    provider.get_device_details(&device_id)
}

#[tauri::command]
pub async fn eject_device(device_id: String) -> Result<(), StorageError> {
    let provider = WindowsDeviceProvider::new();
    provider.eject_device(&device_id)
}
