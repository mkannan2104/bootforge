pub mod gpt;
pub mod mbr;

pub use gpt::*;
pub use mbr::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionLayoutInspection {
    pub device_id: String,
    pub total_size_bytes: u64,
    pub partition_style: String,
    pub partitions: Vec<PartitionVisualSlice>,
    pub unallocated_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionVisualSlice {
    pub name: String,
    pub size_bytes: u64,
    pub filesystem: String,
    pub slice_type: String, // "EFI", "Linux", "Recovery", "Data", "Unallocated"
    pub percentage: f64,
}
