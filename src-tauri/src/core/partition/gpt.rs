pub const EFI_SYSTEM_PARTITION_GUID: [u8; 16] = [
    0x28, 0x73, 0x2A, 0xC1, 0x1F, 0xF8, 0xD2, 0x11, 0xBA, 0x4B, 0x00, 0xA0, 0xC9, 0x3E, 0xC9, 0x3B,
];

pub const MICROSOFT_BASIC_DATA_GUID: [u8; 16] = [
    0xA2, 0xA0, 0xD0, 0xEB, 0xE5, 0xB9, 0x33, 0x4B, 0x87, 0xC0, 0x68, 0xB6, 0xB7, 0x26, 0x99, 0xC7,
];

#[derive(Debug, Clone)]
pub struct GptHeader {
    pub revision: u32,
    pub header_size: u32,
    pub current_lba: u64,
    pub backup_lba: u64,
    pub first_usable_lba: u64,
    pub last_usable_lba: u64,
    pub disk_guid: [u8; 16],
    pub partition_entry_lba: u64,
    pub num_partition_entries: u32,
    pub partition_entry_size: u32,
}

pub fn parse_gpt_header(sector: &[u8; 512]) -> Option<GptHeader> {
    if &sector[0..8] != b"EFI PART" {
        return None;
    }

    let revision = u32::from_le_bytes(sector[8..12].try_into().unwrap_or([0; 4]));
    let header_size = u32::from_le_bytes(sector[12..16].try_into().unwrap_or([0; 4]));
    let current_lba = u64::from_le_bytes(sector[24..32].try_into().unwrap_or([0; 8]));
    let backup_lba = u64::from_le_bytes(sector[32..40].try_into().unwrap_or([0; 8]));
    let first_usable_lba = u64::from_le_bytes(sector[40..48].try_into().unwrap_or([0; 8]));
    let last_usable_lba = u64::from_le_bytes(sector[48..56].try_into().unwrap_or([0; 8]));

    let mut disk_guid = [0u8; 16];
    disk_guid.copy_from_slice(&sector[56..72]);

    let partition_entry_lba = u64::from_le_bytes(sector[72..80].try_into().unwrap_or([0; 8]));
    let num_partition_entries = u32::from_le_bytes(sector[80..84].try_into().unwrap_or([0; 4]));
    let partition_entry_size = u32::from_le_bytes(sector[84..88].try_into().unwrap_or([0; 4]));

    Some(GptHeader {
        revision,
        header_size,
        current_lba,
        backup_lba,
        first_usable_lba,
        last_usable_lba,
        disk_guid,
        partition_entry_lba,
        num_partition_entries,
        partition_entry_size,
    })
}
