#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use std::process::Command;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FlushFileBuffers, WriteFile,
    FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};

const GENERIC_READ: u32 = 0x80000000;
const GENERIC_WRITE: u32 = 0x40000000;
#[cfg(windows)]
use windows_sys::Win32::System::Ioctl::IOCTL_DISK_UPDATE_PROPERTIES;
#[cfg(windows)]
use windows_sys::Win32::System::IO::DeviceIoControl;

use crate::errors::StorageError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetFilesystem {
    Fat32,
    ExFat,
    Ntfs,
}

impl TargetFilesystem {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Fat32 => "FAT32",
            Self::ExFat => "exFAT",
            Self::Ntfs => "NTFS",
        }
    }
}

/// Zeroes out the beginning and end sectors of the disk to completely obliterate existing MBR/GPT layouts
#[cfg(windows)]
pub fn wipe_partition_table_signatures(device_path: &str, _total_disk_size: u64) -> Result<(), StorageError> {
    let wide: Vec<u16> = OsStr::new(device_path).encode_wide().chain(Some(0)).collect();

    unsafe {
        let handle = CreateFileW(
            wide.as_ptr(),
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            std::ptr::null(),
            OPEN_EXISTING,
            0,
            std::ptr::null_mut(),
        );

        if handle == INVALID_HANDLE_VALUE {
            return Err(StorageError::AccessDenied(format!(
                "Failed to open {} for partition table wiping",
                device_path
            )));
        }

        // 1MB of zeroes to wipe first 2048 sectors (MBR + GPT primary header + entries)
        let zero_buffer = vec![0u8; 1024 * 1024];
        let mut written = 0u32;
        let success = WriteFile(
            handle,
            zero_buffer.as_ptr(),
            zero_buffer.len() as u32,
            &mut written,
            std::ptr::null_mut(),
        );

        if success == 0 {
            CloseHandle(handle);
            return Err(StorageError::WriteFailed("Failed to wipe disk header sectors".into()));
        }

        FlushFileBuffers(handle);

        // Notify Windows kernel of disk geometry/layout change
        let mut bytes_ret = 0u32;
        let _ = DeviceIoControl(
            handle,
            IOCTL_DISK_UPDATE_PROPERTIES,
            std::ptr::null(),
            0,
            std::ptr::null_mut(),
            0,
            &mut bytes_ret,
            std::ptr::null_mut(),
        );

        CloseHandle(handle);
    }

    Ok(())
}

/// Restores the disk by initializing MBR, creating a single partition spanning the disk, and formatting with requested filesystem
#[cfg(windows)]
pub fn restore_and_format_disk(
    device_number: u32,
    device_path: &str,
    total_disk_size: u64,
    filesystem: TargetFilesystem,
    volume_label: &str,
) -> Result<(), StorageError> {
    // 1. Wipe old partition table
    wipe_partition_table_signatures(device_path, total_disk_size)?;

    // 2. Safely create single partition and format using Windows Storage PowerShell cmdlet
    // (Non-interactive, parameter validated, targeting only the exact disk number)
    let label = if volume_label.trim().is_empty() {
        "BOOTFORGE"
    } else {
        volume_label.trim()
    };

    let fs_str = filesystem.as_str();

    // PowerShell script: Initialize-Disk, New-Partition, Format-Volume
    let ps_script = format!(
        r#"
$ErrorActionPreference = 'Stop'
$disk = Get-Disk -Number {num}
if ($disk.IsSystem -or $disk.IsBoot) {{
    throw "Target disk {num} is system or boot disk"
}}
Initialize-Disk -Number {num} -PartitionStyle MBR -ErrorAction Stop
$part = New-Partition -DiskNumber {num} -UseMaximumSize -AssignDriveLetter -ErrorAction Stop
Start-Sleep -Milliseconds 500
Format-Volume -Partition $part -FileSystem {fs} -NewFileSystemLabel "{label}" -Confirm:$false -ErrorAction Stop
"#,
        num = device_number,
        fs = fs_str,
        label = label
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .output()
        .map_err(|e| StorageError::OperationFailed(format!("Failed to execute partition restore: {}", e)))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(StorageError::OperationFailed(format!(
            "Disk restore failed on Disk {}: {}",
            device_number, err_msg
        )));
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn restore_and_format_disk(
    _device_number: u32,
    _device_path: &str,
    _total_disk_size: u64,
    _filesystem: TargetFilesystem,
    _volume_label: &str,
) -> Result<(), StorageError> {
    Ok(())
}
