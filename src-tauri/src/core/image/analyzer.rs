use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use super::el_torito::parse_el_torito;
use super::iso9660::parse_iso9660_pvd;
use crate::errors::StorageError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImageFormat {
    Iso9660,
    HybridIso,
    RawDiskImage,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BootType {
    UefiOnly,
    BiosOnly,
    UefiAndBiosHybrid,
    NonBootable,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompatibilityLevel {
    Supported,
    PartiallySupported,
    Unsupported,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DetectedOs {
    Windows(String),
    Ubuntu(String),
    Debian(String),
    Fedora(String),
    ArchLinux(String),
    ChromeOsFlex(String),
    GenericLinux(String),
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub format: ImageFormat,
    pub boot_type: BootType,
    pub compatibility: CompatibilityLevel,
    pub detected_os: DetectedOs,
    pub volume_label: Option<String>,
    pub has_el_torito: bool,
    pub has_mbr: bool,
    pub has_gpt: bool,
    pub sha256: Option<String>,
}

pub fn analyze_image<P: AsRef<Path>>(path: P) -> Result<ImageMetadata, StorageError> {
    let path_ref = path.as_ref();
    if !path_ref.exists() {
        return Err(StorageError::InvalidImage(format!("File not found: {}", path_ref.display())));
    }

    let mut file = File::open(path_ref)?;
    let metadata = file.metadata()?;
    let size_bytes = metadata.len();

    if size_bytes < 512 {
        return Err(StorageError::InvalidImage("File size too small to contain bootable structure".into()));
    }

    let filename = path_ref
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "image.iso".into());

    // 1. Inspect Sector 0 (MBR)
    let mut sector0 = [0u8; 512];
    file.seek(SeekFrom::Start(0))?;
    file.read_exact(&mut sector0)?;
    let has_mbr = sector0[510] == 0x55 && sector0[511] == 0xAA;

    // 2. Inspect Sector 1 (GPT Header)
    let mut sector1 = [0u8; 512];
    let mut has_gpt = false;
    if size_bytes >= 1024 {
        file.seek(SeekFrom::Start(512))?;
        if file.read_exact(&mut sector1).is_ok() {
            has_gpt = &sector1[0..8] == b"EFI PART";
        }
    }

    // 3. Inspect ISO 9660 & El Torito
    let iso_info = parse_iso9660_pvd(&mut file).ok().flatten();
    let el_torito_info = parse_el_torito(&mut file).ok().flatten();

    let has_iso = iso_info.is_some();
    let has_el_torito = el_torito_info.as_ref().map(|e| e.is_bootable).unwrap_or(false);

    // Determine Format
    let format = if has_iso && (has_mbr || has_gpt) {
        ImageFormat::HybridIso
    } else if has_iso {
        ImageFormat::Iso9660
    } else if has_mbr || has_gpt {
        ImageFormat::RawDiskImage
    } else {
        ImageFormat::Unknown
    };

    // Determine Boot Type
    let boot_type = if let Some(ref et) = el_torito_info {
        if et.has_efi_boot && et.has_x86_boot {
            BootType::UefiAndBiosHybrid
        } else if et.has_efi_boot {
            BootType::UefiOnly
        } else if et.has_x86_boot || et.is_bootable {
            BootType::BiosOnly
        } else {
            BootType::NonBootable
        }
    } else if has_gpt {
        BootType::UefiOnly
    } else if has_mbr {
        BootType::BiosOnly
    } else {
        BootType::Unknown
    };

    // Detect OS
    let volume_label = iso_info.as_ref().map(|i| i.volume_id.clone());
    let detected_os = detect_os(&filename, volume_label.as_deref(), &sector0);

    // Determine Compatibility Level
    let compatibility = match (&format, &boot_type) {
        (ImageFormat::HybridIso, BootType::UefiAndBiosHybrid) | (ImageFormat::HybridIso, BootType::UefiOnly) => {
            CompatibilityLevel::Supported
        }
        (ImageFormat::Iso9660, BootType::UefiAndBiosHybrid) | (ImageFormat::Iso9660, BootType::UefiOnly) => {
            CompatibilityLevel::Supported
        }
        (ImageFormat::Iso9660, BootType::BiosOnly) | (ImageFormat::HybridIso, BootType::BiosOnly) => {
            CompatibilityLevel::Supported
        }
        (ImageFormat::RawDiskImage, BootType::UefiOnly) | (ImageFormat::RawDiskImage, BootType::BiosOnly) => {
            CompatibilityLevel::Supported
        }
        (ImageFormat::Unknown, _) | (_, BootType::NonBootable) => CompatibilityLevel::Unsupported,
        _ => CompatibilityLevel::PartiallySupported,
    };

    Ok(ImageMetadata {
        path: path_ref.to_string_lossy().to_string(),
        filename,
        size_bytes,
        format,
        boot_type,
        compatibility,
        detected_os,
        volume_label,
        has_el_torito,
        has_mbr,
        has_gpt,
        sha256: None, // Calculated on demand
    })
}

fn detect_os(filename: &str, volume_id: Option<&str>, sector0: &[u8; 512]) -> DetectedOs {
    let name_upper = filename.to_uppercase();
    let vol_upper = volume_id.map(|v| v.to_uppercase()).unwrap_or_default();
    let mbr_str = String::from_utf8_lossy(sector0).to_uppercase();

    if vol_upper.contains("CCCOMA") || vol_upper.contains("SSS_") || vol_upper.contains("WIN")
        || name_upper.contains("WIN10") || name_upper.contains("WIN11") || name_upper.contains("WINDOWS")
    {
        let ver = if name_upper.contains("WIN11") || vol_upper.contains("WIN11") {
            "Windows 11"
        } else if name_upper.contains("WIN10") || vol_upper.contains("WIN10") {
            "Windows 10"
        } else {
            "Windows"
        };
        DetectedOs::Windows(ver.into())
    } else if vol_upper.contains("UBUNTU") || name_upper.contains("UBUNTU") {
        DetectedOs::Ubuntu("Ubuntu Linux".into())
    } else if vol_upper.contains("DEBIAN") || name_upper.contains("DEBIAN") {
        DetectedOs::Debian("Debian GNU/Linux".into())
    } else if vol_upper.contains("FEDORA") || name_upper.contains("FEDORA") {
        DetectedOs::Fedora("Fedora Linux".into())
    } else if vol_upper.contains("ARCH") || name_upper.contains("ARCH") {
        DetectedOs::ArchLinux("Arch Linux".into())
    } else if name_upper.contains("CHROMEOS") || name_upper.contains("CHROME_OS") || mbr_str.contains("CHROMEOS") {
        DetectedOs::ChromeOsFlex("ChromeOS / ChromeOS Flex".into())
    } else if vol_upper.contains("LINUX") || name_upper.contains("LINUX") || name_upper.contains("ISO") {
        DetectedOs::GenericLinux("Linux Live/Installer".into())
    } else {
        DetectedOs::Unknown
    }
}
