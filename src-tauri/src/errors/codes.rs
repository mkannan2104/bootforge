use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum StorageError {
    #[error("Device not found: {0}")]
    DeviceNotFound(String),

    #[error("Administrator privileges required. Please run BootForge as Administrator: {0}")]
    AccessDenied(String),

    #[error("SAFETY LOCK: Device {0} is a protected system drive and cannot be modified.")]
    ProtectedDevice(String),

    #[error("SAFETY ALERT: Device state changed since selection ({0}). Operation aborted for safety.")]
    DeviceChanged(String),

    #[error("Device disconnected unexpectedly: {0}")]
    DeviceDisconnected(String),

    #[error("Failed to lock/dismount device or volume: {0}")]
    LockFailed(String),

    #[error("Failed to write to device: {0}")]
    WriteFailed(String),

    #[error("Data verification failed: {0}")]
    VerificationFailed(String),

    #[error("Invalid or corrupted image: {0}")]
    InvalidImage(String),

    #[error("Unsupported image format: {0}")]
    UnsupportedFormat(String),

    #[error("Insufficient device capacity. Required: {required} bytes, Available: {available} bytes")]
    InsufficientSpace { required: u64, available: u64 },

    #[error("I/O error: {0}")]
    IoError(String),

    #[error("Operation was cancelled by the user")]
    Cancelled,

    #[error("Operation failed: {0}")]
    OperationFailed(String),
}

impl From<std::io::Error> for StorageError {
    fn from(err: std::io::Error) -> Self {
        StorageError::IoError(err.to_string())
    }
}
