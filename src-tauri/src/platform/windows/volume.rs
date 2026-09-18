#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
    GetLogicalDriveStringsW, GetDriveTypeW,
};

const DRIVE_REMOVABLE: u32 = 2;
const GENERIC_READ: u32 = 0x80000000;
const GENERIC_WRITE: u32 = 0x40000000;

#[cfg(windows)]
use windows_sys::Win32::System::Ioctl::{
    FSCTL_DISMOUNT_VOLUME, FSCTL_LOCK_VOLUME, FSCTL_UNLOCK_VOLUME,
    IOCTL_STORAGE_GET_DEVICE_NUMBER, STORAGE_DEVICE_NUMBER,
};
#[cfg(windows)]
use windows_sys::Win32::System::IO::DeviceIoControl;

use crate::errors::StorageError;

#[derive(Debug, Clone)]
pub struct MappedVolume {
    pub drive_letter: char,
    pub device_number: u32,
    pub partition_number: u32,
    pub is_system_drive: bool,
    pub is_removable: bool,
}

#[cfg(windows)]
pub fn get_system_drive_letter() -> Option<char> {
    if let Ok(sys_drive) = std::env::var("SystemDrive") {
        if let Some(c) = sys_drive.chars().next() {
            return Some(c.to_ascii_uppercase());
        }
    }
    Some('C')
}

#[cfg(windows)]
pub fn list_mapped_volumes() -> Vec<MappedVolume> {
    let mut results = Vec::new();
    let sys_drive = get_system_drive_letter().unwrap_or('C');

    let mut buf = [0u16; 512];
    let len = unsafe { GetLogicalDriveStringsW(buf.len() as u32, buf.as_mut_ptr()) };
    if len == 0 || len > buf.len() as u32 {
        return results;
    }

    let mut offset = 0;
    while offset < len as usize && buf[offset] != 0 {
        let drive_letter = match char::from_u32(buf[offset] as u32) {
            Some(c) => c.to_ascii_uppercase(),
            None => {
                offset += 4;
                continue;
            }
        };

        // Root path e.g. "C:\\\0"
        let root_str = format!("{}:\\", drive_letter);
        let root_wide: Vec<u16> = OsStr::new(&root_str).encode_wide().chain(Some(0)).collect();
        let drive_type = unsafe { GetDriveTypeW(root_wide.as_ptr()) };
        let is_removable = drive_type == DRIVE_REMOVABLE;

        // Open volume e.g. "\\\\.\\C:"
        let vol_str = format!("\\\\.\\{}:", drive_letter);
        let vol_wide: Vec<u16> = OsStr::new(&vol_str).encode_wide().chain(Some(0)).collect();

        unsafe {
            let handle = CreateFileW(
                vol_wide.as_ptr(),
                0, // Query access only
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                std::ptr::null(),
                OPEN_EXISTING,
                0,
                std::ptr::null_mut(),
            );

            if handle != INVALID_HANDLE_VALUE {
                let mut dev_num = std::mem::zeroed::<STORAGE_DEVICE_NUMBER>();
                let mut bytes_returned = 0u32;

                let success = DeviceIoControl(
                    handle,
                    IOCTL_STORAGE_GET_DEVICE_NUMBER,
                    std::ptr::null(),
                    0,
                    &mut dev_num as *mut _ as *mut _,
                    std::mem::size_of::<STORAGE_DEVICE_NUMBER>() as u32,
                    &mut bytes_returned,
                    std::ptr::null_mut(),
                );

                CloseHandle(handle);

                if success != 0 {
                    results.push(MappedVolume {
                        drive_letter,
                        device_number: dev_num.DeviceNumber,
                        partition_number: dev_num.PartitionNumber,
                        is_system_drive: drive_letter == sys_drive,
                        is_removable,
                    });
                }
            }
        }

        // Advance to next null-terminated drive in multi-string
        while offset < len as usize && buf[offset] != 0 {
            offset += 1;
        }
        offset += 1; // skip null
    }

    results
}

#[cfg(windows)]
pub struct VolumeLockGuard {
    handles: Vec<HANDLE>,
}

#[cfg(windows)]
impl VolumeLockGuard {
    pub fn release(&mut self) {
        for &h in &self.handles {
            if h != INVALID_HANDLE_VALUE {
                unsafe {
                    let mut bytes_returned = 0u32;
                    DeviceIoControl(
                        h,
                        FSCTL_UNLOCK_VOLUME,
                        std::ptr::null(),
                        0,
                        std::ptr::null_mut(),
                        0,
                        &mut bytes_returned,
                        std::ptr::null_mut(),
                    );
                    CloseHandle(h);
                }
            }
        }
        self.handles.clear();
    }
}

#[cfg(windows)]
impl Drop for VolumeLockGuard {
    fn drop(&mut self) {
        self.release();
    }
}

/// Locks and dismounts all volumes residing on the target physical disk
#[cfg(windows)]
pub fn lock_and_dismount_device_volumes(device_number: u32) -> Result<VolumeLockGuard, StorageError> {
    let volumes = list_mapped_volumes();
    let target_volumes: Vec<_> = volumes
        .into_iter()
        .filter(|v| v.device_number == device_number)
        .collect();

    let mut locked_handles = Vec::new();

    for vol in target_volumes {
        if vol.is_system_drive {
            return Err(StorageError::ProtectedDevice(format!(
                "Volume {}: is the active system drive! Aborting.",
                vol.drive_letter
            )));
        }

        let vol_str = format!("\\\\.\\{}:", vol.drive_letter);
        let vol_wide: Vec<u16> = OsStr::new(&vol_str).encode_wide().chain(Some(0)).collect();

        unsafe {
            // Need GENERIC_READ | GENERIC_WRITE to lock volume
            let handle = CreateFileW(
                vol_wide.as_ptr(),
                GENERIC_READ | GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                std::ptr::null(),
                OPEN_EXISTING,
                0,
                std::ptr::null_mut(),
            );

            if handle == INVALID_HANDLE_VALUE {
                // Warning: could not open volume for exclusive locking
                continue;
            }

            let mut bytes_ret = 0u32;
            // Send FSCTL_LOCK_VOLUME
            let _ = DeviceIoControl(
                handle,
                FSCTL_LOCK_VOLUME,
                std::ptr::null(),
                0,
                std::ptr::null_mut(),
                0,
                &mut bytes_ret,
                std::ptr::null_mut(),
            );

            // Send FSCTL_DISMOUNT_VOLUME
            let _ = DeviceIoControl(
                handle,
                FSCTL_DISMOUNT_VOLUME,
                std::ptr::null(),
                0,
                std::ptr::null_mut(),
                0,
                &mut bytes_ret,
                std::ptr::null_mut(),
            );

            locked_handles.push(handle);
        }
    }

    Ok(VolumeLockGuard {
        handles: locked_handles,
    })
}

#[cfg(not(windows))]
pub struct VolumeLockGuard;
#[cfg(not(windows))]
pub fn lock_and_dismount_device_volumes(_device_number: u32) -> Result<VolumeLockGuard, StorageError> {
    Ok(VolumeLockGuard)
}
