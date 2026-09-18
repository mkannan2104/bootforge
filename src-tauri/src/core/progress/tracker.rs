use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OperationStage {
    Preparing,
    Writing,
    Flushing,
    Verifying,
    Restoring,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub operation_id: String,
    pub stage: OperationStage,
    pub bytes_processed: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub speed_bytes_per_sec: u64,
    pub eta_seconds: Option<u64>,
    pub elapsed_seconds: u64,
    pub message: String,
}
