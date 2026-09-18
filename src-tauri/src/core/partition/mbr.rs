#[derive(Debug, Clone)]
pub struct MbrPartitionEntry {
    pub boot_indicator: u8, // 0x80 = active/bootable
    pub start_chs: [u8; 3],
    pub partition_type: u8,
    pub end_chs: [u8; 3],
    pub lba_start: u32,
    pub lba_length: u32,
}

#[derive(Debug, Clone)]
pub struct MbrTable {
    pub disk_signature: u32,
    pub partitions: [Option<MbrPartitionEntry>; 4],
}

pub fn parse_mbr(sector: &[u8; 512]) -> Option<MbrTable> {
    if sector[510] != 0x55 || sector[511] != 0xAA {
        return None;
    }

    let disk_signature = u32::from_le_bytes(sector[440..444].try_into().unwrap_or([0; 4]));
    let mut parts: [Option<MbrPartitionEntry>; 4] = [None, None, None, None];

    for i in 0..4 {
        let offset = 446 + i * 16;
        let entry_bytes = &sector[offset..offset + 16];
        let p_type = entry_bytes[4];
        if p_type != 0 {
            parts[i] = Some(MbrPartitionEntry {
                boot_indicator: entry_bytes[0],
                start_chs: [entry_bytes[1], entry_bytes[2], entry_bytes[3]],
                partition_type: p_type,
                end_chs: [entry_bytes[5], entry_bytes[6], entry_bytes[7]],
                lba_start: u32::from_le_bytes(entry_bytes[8..12].try_into().unwrap_or([0; 4])),
                lba_length: u32::from_le_bytes(entry_bytes[12..16].try_into().unwrap_or([0; 4])),
            });
        }
    }

    Some(MbrTable {
        disk_signature,
        partitions: parts,
    })
}
