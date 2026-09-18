# BootForge

> **Production-Grade, Safety-Critical Windows Desktop Bootable USB Creator & Restoration Utility**

BootForge is a native Windows desktop application engineered in **Rust** and **React 19 / TypeScript** that writes bootable OS images (Windows 11/10, Linux, ChromeOS Flex) to USB drives and restores bootable media back to normal Windows-readable storage.

---

## Key Features

- **Extreme Safety Guardrails**:
  - Internal boot disks (`C:`, NVMe, fixed SATA) are permanently locked and quarantined.
  - Multi-signal validation: Checks bus type, partition flags, mount points, and physical device numbers.
  - TOCTOU Defense: Hardware fingerprinting (SHA-256) ensures the device connected at flash time is identical to the one inspected.
  - Dual confirmation modal with high-capacity typing guard (`ERASE` required for drives > 64 GB).
- **Universal OS Image Support**:
  - Windows 11 & 10 official ISOs (UEFI & BIOS).
  - Linux distributions: Ubuntu, Debian, Fedora, Arch Linux, Alpine, Proxmox (Hybrid ISO / El Torito).
  - ChromeOS / ChromeOS Flex RAW & BIN image files.
- **USB Storage Restoration Tool**:
  - Completely wipes EFI partitions, hybrid ISO tables, and zero-fills primary and backup GPT headers.
  - Reconstructs a clean single MBR partition and formats to standard FAT32, exFAT, or NTFS.
- **High-Performance Direct I/O**:
  - Win32 direct volume locking (`FSCTL_LOCK_VOLUME`, `FSCTL_DISMOUNT_VOLUME`) and raw streaming (`CreateFileW`).
  - Strict $O(1)$ memory consumption: Never loads multi-gigabyte ISOs into RAM.
  - Explicit cache flushing (`FlushFileBuffers`) and post-write sector readback verification.
- **Offline & Privacy First**:
  - Zero telemetry, zero analytics, zero network requests. Fully functional in air-gapped environments.

---

## Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | Tauri v2 |
| **Native Engine** | Rust 1.85+ (Win32 API, windows-sys, serde, sha2) |
| **Toolchain** | LLVM-MinGW UCRT (`x86_64-pc-windows-gnullvm`) |
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **State Management** | Zustand |

---

## Directory Structure

```
bootforge/
├── docs/                     # Technical documentation
│   ├── architecture.md       # Architecture & component layout
│   ├── compatibility.md      # OS image compatibility matrix
│   ├── security.md           # Threat model & safety validation rules
│   ├── storage-engine.md     # Windows low-level IOCTLs & direct I/O
│   └── testing.md            # Unit tests & QA guidelines
├── src-tauri/                # Rust Native Backend
│   ├── src/
│   │   ├── commands/         # Tauri IPC commands (device, image, imaging, restore, settings)
│   │   ├── core/             # Agnostic core (device, image, safety, imaging, verification)
│   │   ├── platform/windows/ # Win32 storage IOCTLs, volume locking, and direct I/O
│   │   ├── logging/          # In-memory audit logging engine
│   │   ├── security/         # Windows elevation detection
│   │   ├── errors/           # StorageError enumeration
│   │   ├── lib.rs            # Tauri builder & module exports
│   │   ├── main.rs           # Application entrypoint
│   │   └── tests.rs          # Automated test suite
│   ├── Cargo.toml            # Rust dependencies & build configuration
│   └── tauri.conf.json       # Tauri window & capability configuration
├── src/                      # React Frontend
│   ├── components/           # Reusable UI components
│   │   ├── common/           # Button, Modal, Card, ProgressBar, Badge
│   │   ├── device/           # DeviceCard, DeviceSelector, PartitionVisualizer
│   │   ├── image/            # ImageDropzone, ImageMetadataCard
│   │   ├── layout/           # Sidebar, Header, AppLayout
│   │   └── workflow/         # StepHeader, ConfirmDialog, ProgressScreen, CompletionScreen
│   ├── pages/                # Main application views
│   │   ├── HomePage.tsx
│   │   ├── CreateBootablePage.tsx
│   │   ├── RestoreUsbPage.tsx
│   │   ├── ActivityPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/             # Tauri IPC & Event Listeners
│   ├── stores/               # Zustand stores
│   ├── types/                # TypeScript interface definitions
│   ├── App.tsx               # Root App router & event binding
│   └── main.tsx              # React DOM entrypoint
└── package.json              # Node dependencies
```

---

## Building & Running

### Prerequisites
1. **Node.js**: v18 or later
2. **Rust**: Rustup installed with target `x86_64-pc-windows-gnullvm`
3. **MinGW**: LLVM-MinGW UCRT installed

### Build Frontend
```powershell
npm install
npm run build
```

### Run Rust Unit Tests
```powershell
cd src-tauri
$env:PATH = "C:\Users\PC\.cargo\bin;C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin;" + $env:PATH
cargo test --target x86_64-pc-windows-gnullvm
```

### Run Desktop Application in Development
```powershell
npm run tauri dev
```

### Build Windows Executable (.exe & Installers)
You can build the standalone portable `.exe` and installer packages with one command:
```powershell
npm run build:exe
```
Or directly run the PowerShell script:
```powershell
.\build-exe.ps1
```
Output files are staged in the [`dist-exe/`](file:///dist-exe):
- `dist-exe/BootForge.exe` — Standalone portable executable (runs immediately without installation)
- `dist-exe/BootForge-Setup.exe` — Standard Windows NSIS installer
- `dist-exe/BootForge.msi` — Windows Installer MSI package

---

## License
MIT License
