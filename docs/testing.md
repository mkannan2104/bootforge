# BootForge Testing & QA Guide

## 1. Automated Test Suite

BootForge includes automated unit tests covering safety rules, device fingerprinting, speed and ETA tracking, and boundary validations:

```powershell
# Run backend Rust test suite
cd bootforge\src-tauri
$env:PATH = "C:\Users\PC\.cargo\bin;C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin;" + $env:PATH
cargo test --target x86_64-pc-windows-gnullvm
```

### Test Case Coverage
1. `test_safety_validator_blocks_system_disk`: Verifies that physical drives containing system or boot flags (`C:\`) are locked with `StorageError::TargetIsSystemDrive`.
2. `test_safety_validator_blocks_non_removable_drive`: Verifies that internal NVMe/SATA fixed disks cannot be selected.
3. `test_safety_validator_enforces_capacity`: Verifies that images larger than target capacity are rejected with `StorageError::InsufficientTargetCapacity`.
4. `test_safety_validator_permits_valid_usb`: Confirms valid removable USB flash drives pass all safety checks.
5. `test_device_fingerprint_generation_and_verification`: Verifies deterministic SHA-256 fingerprint matching and rejection of mismatched serials or device paths.
6. `test_speed_tracker_and_eta`: Validates rolling window throughput calculation and ETA estimation.

---

## 2. Frontend Build Verification
```powershell
cd bootforge
npm run build
```
- Tests TypeScript type safety against all data structures.
- Bundles CSS and JavaScript assets using Vite.

---

## 3. Physical Hardware Testing Matrix

When conducting manual validation on physical hardware:
1. **Device Insertion / Removal**:
   - Insert USB flash drive -> Verify it appears in the device list.
   - Remove USB flash drive -> Click Refresh, verify it disappears.
2. **System Disk Quarantine**:
   - Verify Disk 0 (Internal NVMe/SATA SSD) is listed under "Protected Internal Disks (Locked)" and cannot be selected.
3. **Small USB Drive Test**:
   - Attempt to select an 8 GB USB drive for an 8.5 GB Windows 11 ISO -> Verify the UI displays an Insufficient Capacity badge and disables the Continue button.
4. **Cancellation Flow**:
   - Start writing an ISO -> Click "Abort Operation" -> Confirm abort dialog -> Verify write thread terminates and drive state reports Cancelled.
5. **USB Restoration**:
   - Insert flashed USB -> Navigate to "Restore USB" -> Select FAT32/exFAT -> Execute -> Verify Windows Explorer recognizes the restored drive letter.
