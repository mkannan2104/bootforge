#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::fs::File;
#[cfg(windows)]
use std::io::{Read, Seek, SeekFrom};
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use std::path::Path;
#[cfg(windows)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FlushFileBuffers, WriteFile, ReadFile,
    FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};

pub const GENERIC_READ: u32 = 0x80000000;
pub const GENERIC_WRITE: u32 = 0x40000000;

use crate::errors::StorageError;

pub const DEFAULT_BLOCK_SIZE: usize = 2 * 1024 * 1024; // 2MB buffer

#[cfg(windows)]
pub struct PhysicalDriveHandle {
    handle: HANDLE,
    device_path: String,
}

#[cfg(windows)]
impl PhysicalDriveHandle {
    pub fn open(device_path: &str, writable: bool) -> Result<Self, StorageError> {
        let wide: Vec<u16> = OsStr::new(device_path).encode_wide().chain(Some(0)).collect();
        let access = if writable {
            GENERIC_READ | GENERIC_WRITE
        } else {
            GENERIC_READ
        };

        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                access,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                std::ptr::null(),
                OPEN_EXISTING,
                0,
                std::ptr::null_mut(),
            )
        };

        if handle == INVALID_HANDLE_VALUE {
            let err = std::io::Error::last_os_error();
            if err.raw_os_error() == Some(5) {
                // ERROR_ACCESS_DENIED
                return Err(StorageError::AccessDenied(format!(
                    "Cannot open {}: Access Denied. Administrator rights required.",
                    device_path
                )));
            }
            return Err(StorageError::IoError(format!(
                "Failed to open {}: {}",
                device_path, err
            )));
        }

        Ok(Self {
            handle,
            device_path: device_path.to_string(),
        })
    }

    pub fn write_all_bytes(&self, data: &[u8]) -> Result<(), StorageError> {
        let mut total_written = 0;
        while total_written < data.len() {
            let chunk_len = (data.len() - total_written).min(u32::MAX as usize) as u32;
            let mut written = 0u32;
            let success = unsafe {
                WriteFile(
                    self.handle,
                    data[total_written..].as_ptr(),
                    chunk_len,
                    &mut written,
                    std::ptr::null_mut(),
                )
            };

            if success == 0 {
                return Err(StorageError::WriteFailed(format!(
                    "WriteFile failed on {}: {}",
                    self.device_path,
                    std::io::Error::last_os_error()
                )));
            }

            if written == 0 {
                return Err(StorageError::WriteFailed("Zero bytes written to drive".into()));
            }

            total_written += written as usize;
        }
        Ok(())
    }

    pub fn read_bytes(&self, buffer: &mut [u8]) -> Result<usize, StorageError> {
        let mut read = 0u32;
        let success = unsafe {
            ReadFile(
                self.handle,
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                &mut read,
                std::ptr::null_mut(),
            )
        };

        if success == 0 {
            return Err(StorageError::IoError(format!(
                "ReadFile failed on {}: {}",
                self.device_path,
                std::io::Error::last_os_error()
            )));
        }

        Ok(read as usize)
    }

    pub fn flush(&self) -> Result<(), StorageError> {
        let success = unsafe { FlushFileBuffers(self.handle) };
        if success == 0 {
            return Err(StorageError::IoError(format!(
                "FlushFileBuffers failed on {}: {}",
                self.device_path,
                std::io::Error::last_os_error()
            )));
        }
        Ok(())
    }
}

#[cfg(windows)]
impl Drop for PhysicalDriveHandle {
    fn drop(&mut self) {
        if self.handle != INVALID_HANDLE_VALUE {
            unsafe {
                CloseHandle(self.handle);
            }
        }
    }
}

/// Streams raw bytes from source image to target physical drive
#[cfg(windows)]
pub fn stream_write_image<P: AsRef<Path>, F: FnMut(u64, u64)>(
    image_path: P,
    device_path: &str,
    cancellation_token: Arc<AtomicBool>,
    mut progress_callback: F,
) -> Result<(), StorageError> {
    let mut file = File::open(image_path)?;
    let total_bytes = file.metadata()?.len();

    let drive = PhysicalDriveHandle::open(device_path, true)?;

    let mut buffer = vec![0u8; DEFAULT_BLOCK_SIZE];
    let mut bytes_written: u64 = 0;

    while bytes_written < total_bytes {
        if cancellation_token.load(Ordering::Relaxed) {
            let _ = drive.flush();
            return Err(StorageError::Cancelled);
        }

        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }

        drive.write_all_bytes(&buffer[..n])?;
        bytes_written += n as u64;
        progress_callback(bytes_written, total_bytes);
    }

    drive.flush()?;
    Ok(())
}

/// Verifies written data by streaming read-back from physical device and comparing against source image
#[cfg(windows)]
pub fn stream_verify_image<P: AsRef<Path>, F: FnMut(u64, u64)>(
    image_path: P,
    device_path: &str,
    cancellation_token: Arc<AtomicBool>,
    mut progress_callback: F,
) -> Result<(), StorageError> {
    let mut file = File::open(image_path)?;
    let total_bytes = file.metadata()?.len();
    file.seek(SeekFrom::Start(0))?;

    let drive = PhysicalDriveHandle::open(device_path, false)?;

    let mut img_buf = vec![0u8; DEFAULT_BLOCK_SIZE];
    let mut dev_buf = vec![0u8; DEFAULT_BLOCK_SIZE];
    let mut bytes_verified: u64 = 0;

    while bytes_verified < total_bytes {
        if cancellation_token.load(Ordering::Relaxed) {
            return Err(StorageError::Cancelled);
        }

        let to_read = (total_bytes - bytes_verified).min(DEFAULT_BLOCK_SIZE as u64) as usize;
        file.read_exact(&mut img_buf[..to_read])?;

        let mut dev_read_total = 0;
        while dev_read_total < to_read {
            let read = drive.read_bytes(&mut dev_buf[dev_read_total..to_read])?;
            if read == 0 {
                return Err(StorageError::VerificationFailed(
                    "Unexpected end of data while reading back from USB device".into()
                ));
            }
            dev_read_total += read;
        }

        if &img_buf[..to_read] != &dev_buf[..to_read] {
            return Err(StorageError::VerificationFailed(format!(
                "Data mismatch detected at byte offset {}. Device contents do not match source image.",
                bytes_verified
            )));
        }

        bytes_verified += to_read as u64;
        progress_callback(bytes_verified, total_bytes);
    }

    Ok(())
}
