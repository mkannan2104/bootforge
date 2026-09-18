use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use crate::errors::StorageError;
use super::iso9660::ISO_SECTOR_SIZE;

pub const BOOT_RECORD_SECTOR_OFFSET: u64 = 17 * ISO_SECTOR_SIZE as u64; // 34816

#[derive(Debug, Clone)]
pub struct ElToritoInfo {
    pub catalog_lba: u32,
    pub has_x86_boot: bool,
    pub has_efi_boot: bool,
    pub is_bootable: bool,
    pub boot_media_type: u8,
}

pub fn parse_el_torito(file: &mut File) -> Result<Option<ElToritoInfo>, StorageError> {
    let file_len = file.metadata()?.len();
    if file_len < BOOT_RECORD_SECTOR_OFFSET + ISO_SECTOR_SIZE as u64 {
        return Ok(None);
    }

    file.seek(SeekFrom::Start(BOOT_RECORD_SECTOR_OFFSET))?;
    let mut sector = [0u8; ISO_SECTOR_SIZE];
    file.read_exact(&mut sector)?;

    // Byte 0: 0, Bytes 1..6: CD001, Bytes 7..39: EL TORITO SPECIFICATION
    if sector[0] != 0 || &sector[1..6] != b"CD001" {
        return Ok(None);
    }

    let spec_str = String::from_utf8_lossy(&sector[7..39]);
    if !spec_str.starts_with("EL TORITO SPECIFICATION") {
        return Ok(None);
    }

    // Catalog pointer is at offset 71..75 (32-bit LE)
    let catalog_lba = u32::from_le_bytes(sector[71..75].try_into().unwrap_or([0; 4]));
    let catalog_offset = catalog_lba as u64 * ISO_SECTOR_SIZE as u64;

    if catalog_offset + ISO_SECTOR_SIZE as u64 > file_len {
        return Ok(None);
    }

    // Read the boot catalog
    file.seek(SeekFrom::Start(catalog_offset))?;
    let mut catalog_sector = [0u8; ISO_SECTOR_SIZE];
    file.read_exact(&mut catalog_sector)?;

    // Validation entry (bytes 0..32)
    // Header ID should be 0x01, key bytes at 28..30 should be 0x55, 0xAA
    if catalog_sector[0] != 0x01 || catalog_sector[28] != 0x55 || catalog_sector[29] != 0xAA {
        return Ok(None);
    }

    let val_platform = catalog_sector[1];
    let mut has_x86 = val_platform == 0x00;
    let mut has_efi = val_platform == 0xEF;

    // Initial default entry (bytes 32..64)
    let boot_indicator = catalog_sector[32]; // 0x88 = bootable
    let boot_media_type = catalog_sector[33];
    let is_bootable = boot_indicator == 0x88;

    // Check subsequent section entries for EFI boot catalog
    for i in (64..ISO_SECTOR_SIZE).step_by(32) {
        let entry_header = catalog_sector[i];
        if entry_header == 0x90 || entry_header == 0x91 {
            // Section Header
            let section_platform = catalog_sector[i + 1];
            if section_platform == 0xEF {
                has_efi = true;
            } else if section_platform == 0x00 {
                has_x86 = true;
            }
        } else if entry_header == 0x88 {
            // Bootable section entry
        }
    }

    Ok(Some(ElToritoInfo {
        catalog_lba,
        has_x86_boot: has_x86,
        has_efi_boot: has_efi,
        is_bootable,
        boot_media_type,
    }))
}
