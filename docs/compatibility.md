# BootForge OS & Image Compatibility Matrix

## 1. Supported Operating Systems & Formats

BootForge supports raw ISO, IMG, BIN, and RAW disk images across Windows, Linux, and ChromeOS distributions.

| Distribution / OS | Image Type | Partition Layout | Boot Method | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Windows 11 / 10** | Official ISO | ISO 9660 / UDF | UEFI / BIOS | **Fully Supported** | Standard Microsoft media creation ISOs |
| **Ubuntu 24.04 / 22.04** | Desktop & Server ISO | ISOHybrid | UEFI & BIOS Hybrid | **Fully Supported** | Hybrid MBR/GPT boots on both legacy and modern PCs |
| **Debian 12 Bookworm** | Netinst / DVD ISO | ISOHybrid | UEFI & BIOS Hybrid | **Fully Supported** | El Torito boot catalog detected and verified |
| **Fedora 39 / 40 Workstation** | Live ISO | ISOHybrid | UEFI & BIOS Hybrid | **Fully Supported** | Dracut live system image streaming |
| **Arch Linux** | Monthly ISO | ISOHybrid | UEFI & BIOS Hybrid | **Fully Supported** | Archboot loader verified |
| **ChromeOS Flex** | BIN / RAW / IMG | GPT Multi-partition | UEFI Only | **Fully Supported** | Directly flashable to USB for Chromebook conversion |
| **Alpine / Proxmox / ESXi** | Installer ISO | ISOHybrid | UEFI / BIOS | **Fully Supported** | Enterprise hypervisor installation media |

---

## 2. Boot Mode Compatibility

BootForge's `ImageAnalyzer` automatically parses image headers to display the boot capability to the user:
- **UEFI Only**: Contains EFI system partition with `\EFI\BOOT\BOOTX64.EFI`.
- **BIOS Only**: Contains legacy MBR stage 1 bootloader (sector 0 with `0x55AA` signature).
- **Hybrid (UEFI + BIOS)**: Contains both MBR bootstrap code and El Torito / EFI boot catalog for universal compatibility.
- **Non-Bootable**: Lacks boot catalog or boot records (warns user before flashing).

---

## 3. Storage Drive Compatibility
- **USB 2.0 / USB 3.0 / USB 3.1 / USB 3.2**: All standard flash drives.
- **USB External SSD / NVMe Enclosures**: Supported as removable targets (if identified with `BusType::Usb`).
- **SD Cards & MicroSD**: Supported via USB card readers (`BusType::Usb` or `BusType::Sd`).
