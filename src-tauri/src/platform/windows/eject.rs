#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};

const GENERIC_READ: u32 = 0x80000000;
const GENERIC_WRITE: u32 = 0x40000000;
#[cfg(windows)]
use windows_sys::Win32::System::Ioctl::IOCTL_STORAGE_EJECT_MEDIA;
#[cfg(windows)]
use windows_sys::Win32::System::IO::DeviceIoControl;

use crate::errors::StorageError;

#[cfg(windows)]
pub fn eject_drive(device_path: &str) -> Result<(), StorageError> {
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
            return Err(StorageError::IoError(format!(
                "Failed to open {} for ejection",
                device_path
            )));
        }

        let mut bytes_ret = 0u32;
        let success = DeviceIoControl(
            handle,
            IOCTL_STORAGE_EJECT_MEDIA,
            std::ptr::null(),
            0,
            std::ptr::null_mut(),
            0,
            &mut bytes_ret,
            std::ptr::null_mut(),
        );

        CloseHandle(handle);

        if success == 0 {
            let err = std::io::Error::last_os_error();
            return Err(StorageError::IoError(format!(
                "Eject failed on {}: {}",
                device_path, err
            )));
        }
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn eject_drive(_device_path: &str) -> Result<(), StorageError> {
    Ok(())
}
