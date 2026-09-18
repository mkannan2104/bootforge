use crate::core::device::model::{DeviceDetails, DeviceInfo};
use crate::errors::StorageError;

pub trait DeviceProvider: Send + Sync {
    fn list_devices(&self) -> Result<Vec<DeviceInfo>, StorageError>;
    fn get_device_details(&self, device_id: &str) -> Result<DeviceDetails, StorageError>;
    fn eject_device(&self, device_id: &str) -> Result<(), StorageError>;
}
