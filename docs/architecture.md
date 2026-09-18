# BootForge Architecture

## 1. System Overview

BootForge is an offline-first, high-performance, safety-critical Windows desktop application for flashing bootable operating system images (ISO/IMG/RAW) to USB drives and restoring bootable USB media back to clean Windows-readable storage.

```mermaid
graph TB
    subgraph Frontend["React 19 + TypeScript + Tailwind CSS UI"]
        UI_Home[HomePage]
        UI_Create[CreateBootablePage - 5-Step Wizard]
        UI_Restore[RestoreUsbPage - Storage Restoration]
        UI_Activity[ActivityPage - Forensic Log Stream]
        UI_Settings[SettingsPage - I/O Tuning & Elevation]
        Stores[Zustand Stores: Device, Image, Operation, Activity, Settings]
        IPC_Service[Tauri IPC Bridge / Web Fallback]
    end

    subgraph Backend["Rust Core Engine (src-tauri)"]
        Cmds[Tauri Commands Layer: device, image, imaging, restore, settings]
        
        subgraph SafetyEngine["Safety & Validation Engine"]
            Fingerprint[Device Fingerprint - SHA-256 Serial+Path+Bus]
            Validator[Multi-Signal Safety Validator]
            Quarantine[System Disk & Boot Volume Quarantine]
        end

        subgraph ImageEngine["Image Analysis & Streaming Engine"]
            IsoParser[ISO 9660 PVD & El Torito Boot Catalog]
            HashStream[Streaming SHA-256 Engine]
            DirectIO[Direct I/O Streaming Writer O(1) Memory]
            Verifier[Sector Readback Integrity Verifier]
        end

        subgraph PlatformWindows["Windows Low-Level Storage Layer (Win32)"]
            WinDevice[DeviceIoControl - IOCTL_STORAGE_QUERY_PROPERTY]
            WinVolume[FSCTL_LOCK_VOLUME & FSCTL_DISMOUNT_VOLUME]
            WinRawIO[CreateFileW - Raw PhysicalDrive Streaming]
            WinPart[Partitioning & IOCTL_DISK_UPDATE_PROPERTIES]
            WinEject[IOCTL_STORAGE_EJECT_MEDIA]
        end
    end

    Frontend <-->|Tauri IPC / Events| Backend
    Cmds --> SafetyEngine
    Cmds --> ImageEngine
    SafetyEngine --> PlatformWindows
    ImageEngine --> PlatformWindows
```

---

## 2. Layered Component Boundaries

### 2.1 UI Layer (`src/`)
- **Strict Separation of Concerns**: The UI does not execute raw storage logic. It collects user intent, runs client-side preliminary validation, and submits typed payloads over Tauri's IPC bridge.
- **Real-Time Streaming Events**: Long-running write and verification operations broadcast `imaging-progress` events at high frequency (10-20 Hz), updating the ETA calculator and progress bar without locking the UI thread.
- **Zero In-Memory Buffering**: Large ISO files are never read into browser memory or V8 heap.

### 2.2 Tauri Commands (`src-tauri/src/commands/`)
- Intercepts requests, validates inputs, resolves storage devices, checks elevation status, and delegates to the core logic.
- Commands:
  - `list_devices`: Scans attached physical drives, parses volume mount points, computes safety classification and fingerprints.
  - `analyze_image`: Inspects ISO 9660 headers, El Torito catalogs, and GPT/MBR partition tables.
  - `start_write_operation`: Initiates background streaming write thread with volume locking, dismounting, direct I/O, cache flushing, and readback verification.
  - `restore_usb`: Destroys hybrid partition tables, zeroes headers, writes clean MBR partition, and formats filesystem.
  - `cancel_operation`: Atomically signals the running background thread to abort.

### 2.3 Safety Engine (`src-tauri/src/core/safety/`)
- Generates deterministic SHA-256 cryptographic fingerprints of physical drive properties.
- Strictly locks Disk 0, system drive (`C:`), internal NVMe/SATA fixed disks, read-only media, and drives smaller than the image payload.

### 2.4 Windows Low-Level Storage Layer (`src-tauri/src/platform/windows/`)
- Interacts directly with Windows kernel drivers via Win32 API and storage IOCTLs.
- Operates on `\\.\PhysicalDriveX` and `\\.\X:` volume handles.
