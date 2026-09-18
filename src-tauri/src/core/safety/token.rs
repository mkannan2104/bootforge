use sha2::{Digest, Sha256};
use crate::core::device::DeviceInfo;

pub fn generate_device_fingerprint(device: &DeviceInfo) -> String {
    let mut hasher = Sha256::new();
    hasher.update(device.device_id.as_bytes());
    hasher.update(device.device_path.as_bytes());
    hasher.update(device.vendor.as_bytes());
    hasher.update(device.model.as_bytes());
    if let Some(ref serial) = device.serial_number {
        hasher.update(serial.as_bytes());
    }
    hasher.update(&device.size_bytes.to_le_bytes());
    hasher.update(&device.sector_size.to_le_bytes());
    hasher.update(format!("{:?}", device.bus_type).as_bytes());

    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn verify_device_fingerprint(device: &DeviceInfo, expected_fingerprint: &str) -> bool {
    let current_fingerprint = generate_device_fingerprint(device);
    current_fingerprint == expected_fingerprint
}
