#[cfg(test)]
mod tests {
    use crate::core::device::{BusType, DeviceInfo, PartitionStyle, SafetyStatus};
    use crate::core::progress::SpeedTracker;
    use crate::core::safety::{generate_device_fingerprint, verify_device_fingerprint, SafetyValidator};
    use std::time::Duration;

    fn create_test_device(is_system: bool, bus_type: BusType, is_removable: bool, size: u64) -> DeviceInfo {
        let mut dev = DeviceInfo {
            device_id: "PhysicalDrive1".into(),
            device_number: 1,
            device_path: "\\\\.\\PhysicalDrive1".into(),
            vendor: "SanDisk".into(),
            model: "Ultra USB 3.0".into(),
            serial_number: Some("SD12345678".into()),
            size_bytes: size,
            sector_size: 512,
            bus_type,
            is_removable,
            is_system,
            is_boot: is_system,
            is_readonly: false,
            is_offline: false,
            partition_style: PartitionStyle::Mbr,
            partitions: Vec::new(),
            volumes: Vec::new(),
            safety_status: if is_system {
                SafetyStatus::ProtectedSystem
            } else {
                SafetyStatus::SafeForSelection
            },
            fingerprint: String::new(),
        };
        dev.fingerprint = generate_device_fingerprint(&dev);
        dev
    }

    #[test]
    fn test_device_fingerprint_generation_and_verification() {
        let dev = create_test_device(false, BusType::Usb, true, 32_000_000_000);
        assert!(!dev.fingerprint.is_empty());
        assert!(verify_device_fingerprint(&dev, &dev.fingerprint));

        // Tamper test: if size changed by even 1 byte, verification must fail
        let mut tampered = dev.clone();
        tampered.size_bytes += 512;
        assert!(!verify_device_fingerprint(&tampered, &dev.fingerprint));
    }

    #[test]
    fn test_safety_validator_blocks_system_disk() {
        let system_dev = create_test_device(true, BusType::Nvme, false, 500_000_000_000);
        let fp = system_dev.fingerprint.clone();

        let result = SafetyValidator::validate_for_imaging(&system_dev, 4_000_000_000, &fp);
        assert!(result.is_err(), "Safety engine MUST block imaging system disk");

        let restore_result = SafetyValidator::validate_for_restore(&system_dev, &fp);
        assert!(restore_result.is_err(), "Safety engine MUST block restoring system disk");
    }

    #[test]
    fn test_safety_validator_blocks_non_removable_drive() {
        let internal_dev = create_test_device(false, BusType::Sata, false, 1_000_000_000_000);
        let fp = internal_dev.fingerprint.clone();

        let result = SafetyValidator::validate_for_imaging(&internal_dev, 4_000_000_000, &fp);
        assert!(result.is_err(), "Safety engine MUST block internal SATA disk");
    }

    #[test]
    fn test_safety_validator_enforces_capacity() {
        let small_usb = create_test_device(false, BusType::Usb, true, 4_000_000_000);
        let fp = small_usb.fingerprint.clone();

        let result = SafetyValidator::validate_for_imaging(&small_usb, 8_000_000_000, &fp);
        assert!(result.is_err(), "Safety engine MUST reject image larger than USB capacity");
    }

    #[test]
    fn test_safety_validator_permits_valid_usb() {
        let valid_usb = create_test_device(false, BusType::Usb, true, 32_000_000_000);
        let fp = valid_usb.fingerprint.clone();

        let result = SafetyValidator::validate_for_imaging(&valid_usb, 4_000_000_000, &fp);
        assert!(result.is_ok(), "Valid USB must pass imaging safety checks");

        let restore_result = SafetyValidator::validate_for_restore(&valid_usb, &fp);
        assert!(restore_result.is_ok(), "Valid USB must pass restore safety checks");
    }

    #[test]
    fn test_speed_tracker_and_eta() {
        let mut tracker = SpeedTracker::new();
        tracker.record_progress(10_000_000);
        std::thread::sleep(Duration::from_millis(50));
        tracker.record_progress(20_000_000);

        let speed = tracker.calculate_speed();
        assert!(speed > 0, "Calculated speed should be greater than zero");

        let eta = tracker.calculate_eta(100_000_000, 20_000_000);
        assert!(eta.is_some(), "ETA must be calculable for pending bytes");
    }
}
