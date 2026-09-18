# BootForge Security & Threat Model

## 1. Threat Model & Safety Objective

Writing raw disk images directly to block devices (`\\.\PhysicalDriveX`) is an inherently destructive operation. If directed at the wrong physical drive, it permanently obliterates partition tables, operating systems, user data, and filesystem recovery structures.

**BootForge's core safety guarantee**: It must be physically impossible for BootForge to overwrite the host operating system drive, an internal fixed drive, or any drive other than the explicitly verified removable USB target.

---

## 2. Multi-Signal Defense in Depth

BootForge enforces multiple independent layers of defense before any sector is modified:

### 2.1 System Drive Quarantine
1. **Drive 0 Protection**: PhysicalDrive0 is universally treated as the primary boot disk and permanently quarantined.
2. **System & Boot Volume Detection**: Every volume on the target physical drive is inspected. If any volume hosts `SystemRoot`, Windows directory, `C:\`, or possesses the `BOOT` or `SYSTEM` flag, the entire physical drive is locked with `SafetyStatus::ProtectedSystem`.
3. **Fixed Bus Type Quarantine**: NVMe (`BusType::Nvme`), SATA (`BusType::Sata`), and SCSI (`BusType::Scsi`) internal fixed disks are permanently quarantined unless explicitly proven to be hotplug removable. Only `BusType::Usb` and `BusType::Sd` are eligible for selection.

### 2.2 Device Fingerprinting & Race Condition Defense (TOCTOU)
Between the moment a user selects a USB drive in the UI and the moment the user clicks "Proceed to Flash USB", hardware topology can change (e.g. a USB flash drive could be unplugged and an external backup HDD plugged into the same USB port).

To prevent Time-of-Check to Time-of-Use (TOCTOU) vulnerabilities:
1. When devices are scanned, a cryptographic SHA-256 fingerprint is calculated:
   $$\text{Fingerprint} = \text{SHA256}(\text{Vendor} \parallel \text{Model} \parallel \text{Serial} \parallel \text{SizeBytes} \parallel \text{DevicePath} \parallel \text{BusType})$$
2. The UI sends this `expected_fingerprint` with the execution payload.
3. Before writing, the backend independently queries the hardware again, recomputes the fingerprint from live IOCTL queries, and compares it byte-for-byte. If there is any discrepancy, the operation is immediately aborted with `StorageError::DeviceFingerprintMismatch`.

### 2.3 User Confirmation Safeguards
1. **Explicit Identification**: The confirmation modal displays the drive's vendor, model, physical drive index, bus type, and all active drive letters.
2. **Dual Checkboxes**: The user must manually check:
   - Verification of the selected target.
   - Understanding that all data on the target will be permanently erased.
3. **High-Capacity Safeguard**: Drives larger than 64 GB require typing the keyword `ERASE` to prevent accidental selection of large external backup HDDs.

---

## 3. Privilege Isolation & Elevation
- Low-level raw volume and physical disk access on Windows requires `SE_MANAGE_VOLUME_NAME` and Administrator privileges.
- BootForge checks elevation at startup using the Windows Token API (`GetTokenInformation` with `TokenElevation`).
- If un-elevated, clear diagnostic banners are displayed directing the user to run BootForge as Administrator.
