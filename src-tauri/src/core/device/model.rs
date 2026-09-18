use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BusType {
    Usb,
    Nvme,
    Sata,
    Scsi,
    Sd,
    Virtual,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PartitionStyle {
    Mbr,
    Gpt,
    Raw,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionInfo {
    pub number: u32,
    pub starting_offset: u64,
    pub size_bytes: u64,
    pub partition_type: String,
    pub drive_letter: Option<char>,
    pub is_boot: bool,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeInfo {
    pub drive_letter: Option<char>,
    pub volume_guid: String,
    pub label: String,
    pub filesystem: String,
    pub capacity_bytes: u64,
    pub free_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SafetyStatus {
    SafeForSelection,
    ProtectedSystem,
    ProtectedReadOnly,
    IncompatibleCapacity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub device_id: String,
    pub device_number: u32,
    pub device_path: String,
    pub vendor: String,
    pub model: String,
    pub serial_number: Option<String>,
    pub size_bytes: u64,
    pub sector_size: u32,
    pub bus_type: BusType,
    pub is_removable: bool,
    pub is_system: bool,
    pub is_boot: bool,
    pub is_readonly: bool,
    pub is_offline: bool,
    pub partition_style: PartitionStyle,
    pub partitions: Vec<PartitionInfo>,
    pub volumes: Vec<VolumeInfo>,
    pub safety_status: SafetyStatus,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceDetails {
    pub device: DeviceInfo,
    pub raw_bus_type_code: u32,
    pub media_type: String,
    pub physical_sector_size: u32,
    pub logical_sector_size: u32,
    pub is_clustered: bool,
}
