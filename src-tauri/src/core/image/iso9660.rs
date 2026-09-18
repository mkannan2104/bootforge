use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use crate::errors::StorageError;

pub const ISO_SECTOR_SIZE: usize = 2048;
pub const PVD_SECTOR_OFFSET: u64 = 16 * ISO_SECTOR_SIZE as u64; // 32768

#[derive(Debug, Clone)]
pub struct Iso9660Info {
    pub volume_id: String,
    pub system_id: String,
    pub volume_size_sectors: u32,
    pub sector_size: u16,
}

pub fn parse_iso9660_pvd(file: &mut File) -> Result<Option<Iso9660Info>, StorageError> {
    let file_len = file.metadata()?.len();
    if file_len < PVD_SECTOR_OFFSET + ISO_SECTOR_SIZE as u64 {
        return Ok(None);
    }

    file.seek(SeekFrom::Start(PVD_SECTOR_OFFSET))?;
    let mut sector = [0u8; ISO_SECTOR_SIZE];
    file.read_exact(&mut sector)?;

    // Check type (1 for PVD) and standard identifier "CD001"
    if sector[0] != 1 || &sector[1..6] != b"CD001" {
        return Ok(None);
    }

    let system_id = String::from_utf8_lossy(&sector[8..40]).trim().to_string();
    let volume_id = String::from_utf8_lossy(&sector[40..72]).trim().to_string();

    // Volume space size: 32-bit little endian at offset 80..84
    let volume_size_sectors = u32::from_le_bytes(sector[80..84].try_into().unwrap_or([0; 4]));

    // Logical block size: 16-bit little endian at offset 128..130
    let sector_size = u16::from_le_bytes(sector[128..130].try_into().unwrap_or([0, 8]));

    Ok(Some(Iso9660Info {
        volume_id,
        system_id,
        volume_size_sectors,
        sector_size,
    }))
}
