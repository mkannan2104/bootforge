use crate::core::device::{BusType, DeviceInfo, SafetyStatus};
use crate::core::safety::token::verify_device_fingerprint;
use crate::errors::StorageError;

pub struct SafetyValidator;

impl SafetyValidator {
    /// Validates whether a device is eligible for destructive imaging
    pub fn validate_for_imaging(
        device: &DeviceInfo,
        image_size_bytes: u64,
        expected_fingerprint: &str,
    ) -> Result<(), StorageError> {
        // 1. Revalidate identity fingerprint
        if !verify_device_fingerprint(device, expected_fingerprint) {
            return Err(StorageError::DeviceChanged(
                "Device signature does not match the originally confirmed drive. The device may have been removed or replaced.".into()
            ));
        }

        // 2. Absolute system disk protection
        if device.is_system || device.is_boot || device.safety_status == SafetyStatus::ProtectedSystem {
            return Err(StorageError::ProtectedDevice(format!(
                "CRITICAL: {} is the host operating system drive! Destructive actions are permanently forbidden.",
                device.device_id
            )));
        }

        // 3. Prevent writing to read-only devices
        if device.is_readonly || device.safety_status == SafetyStatus::ProtectedReadOnly {
            return Err(StorageError::ProtectedDevice(format!(
                "Device {} is write-protected or read-only.",
                device.device_id
            )));
        }

        // 4. Removable / USB validation
        let is_external = device.is_removable || matches!(device.bus_type, BusType::Usb | BusType::Sd);
        if !is_external {
            return Err(StorageError::ProtectedDevice(format!(
                "Device {} ({:?}) is not recognized as a removable USB storage device.",
                device.device_id, device.bus_type
            )));
        }

        // 5. Capacity sufficiency check
        if device.size_bytes < image_size_bytes {
            return Err(StorageError::InsufficientSpace {
                required: image_size_bytes,
                available: device.size_bytes,
            });
        }

        Ok(())
    }

    /// Validates whether a device is eligible for restoration
    pub fn validate_for_restore(
        device: &DeviceInfo,
        expected_fingerprint: &str,
    ) -> Result<(), StorageError> {
        // 1. Revalidate identity fingerprint
        if !verify_device_fingerprint(device, expected_fingerprint) {
            return Err(StorageError::DeviceChanged(
                "Device signature does not match the originally confirmed drive.".into()
            ));
        }

        // 2. System disk protection
        if device.is_system || device.is_boot || device.safety_status == SafetyStatus::ProtectedSystem {
            return Err(StorageError::ProtectedDevice(format!(
                "CRITICAL: {} is the host system drive. Restoration is blocked.",
                device.device_id
            )));
        }

        // 3. Removable / USB check
        let is_external = device.is_removable || matches!(device.bus_type, BusType::Usb | BusType::Sd);
        if !is_external {
            return Err(StorageError::ProtectedDevice(format!(
                "Device {} is not an external USB drive.",
                device.device_id
            )));
        }

        Ok(())
    }
}
