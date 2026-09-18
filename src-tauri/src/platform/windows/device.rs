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
#[cfg(windows)]
use windows_sys::Win32::System::Ioctl::{
    IOCTL_DISK_GET_DRIVE_GEOMETRY_EX, DISK_GEOMETRY_EX,
    IOCTL_DISK_GET_DRIVE_LAYOUT_EX,
    IOCTL_STORAGE_QUERY_PROPERTY, STORAGE_PROPERTY_QUERY,
    StorageDeviceProperty, PropertyStandardQuery,
};
#[cfg(windows)]
use windows_sys::Win32::System::IO::DeviceIoControl;

use crate::core::device::model::*;
use crate::core::device::provider::DeviceProvider;
use crate::core::safety::generate_device_fingerprint;
use crate::errors::StorageError;
use super::volume::list_mapped_volumes;
use super::eject::eject_drive;

pub struct WindowsDeviceProvider;

impl WindowsDeviceProvider {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WindowsDeviceProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(windows)]
impl DeviceProvider for WindowsDeviceProvider {
    fn list_devices(&self) -> Result<Vec<DeviceInfo>, StorageError> {
        let mut devices = Vec::new();
        let mapped_volumes = list_mapped_volumes();

        // Scan physical drives from 0 to 32
        for disk_num in 0..32 {
            let dev_path = format!("\\\\.\\PhysicalDrive{}", disk_num);
            let wide: Vec<u16> = OsStr::new(&dev_path).encode_wide().chain(Some(0)).collect();

            unsafe {
                let handle = CreateFileW(
                    wide.as_ptr(),
                    0, // Query access only (does not require administrator to enumerate basic geometry)
                    FILE_SHARE_READ | FILE_SHARE_WRITE,
                    std::ptr::null(),
                    OPEN_EXISTING,
                    0,
                    std::ptr::null_mut(),
                );

                if handle == INVALID_HANDLE_VALUE {
                    continue;
                }

                // 1. Query Device Descriptor (BusType, Vendor, Product, Serial, Removable)
                let mut query = std::mem::zeroed::<STORAGE_PROPERTY_QUERY>();
                query.PropertyId = StorageDeviceProperty;
                query.QueryType = PropertyStandardQuery;

                let mut desc_buf = vec![0u8; 1024];
                let mut bytes_ret = 0u32;
                let desc_res = DeviceIoControl(
                    handle,
                    IOCTL_STORAGE_QUERY_PROPERTY,
                    &query as *const _ as *const _,
                    std::mem::size_of::<STORAGE_PROPERTY_QUERY>() as u32,
                    desc_buf.as_mut_ptr() as *mut _,
                    desc_buf.len() as u32,
                    &mut bytes_ret,
                    std::ptr::null_mut(),
                );

                let (bus_type, is_removable, vendor, model, serial_number) = if desc_res != 0 && bytes_ret >= 24 {
                    // STORAGE_DEVICE_DESCRIPTOR layout:
                    // offset 12: BusType (u32)
                    // offset 16: RemovableMedia (u8)
                    // offset 24: VendorIdOffset (u32)
                    // offset 28: ProductIdOffset (u32)
                    // offset 36: SerialNumberOffset (u32)
                    let raw_bus = u32::from_ne_bytes(desc_buf[12..16].try_into().unwrap_or([0; 4]));
                    let raw_removable = desc_buf[16] != 0;

                    let vendor_off = u32::from_ne_bytes(desc_buf[24..28].try_into().unwrap_or([0; 4])) as usize;
                    let product_off = u32::from_ne_bytes(desc_buf[28..32].try_into().unwrap_or([0; 4])) as usize;
                    let serial_off = u32::from_ne_bytes(desc_buf[36..40].try_into().unwrap_or([0; 4])) as usize;

                    let v = read_cstring(&desc_buf, vendor_off).unwrap_or_default();
                    let m = read_cstring(&desc_buf, product_off).unwrap_or_else(|| format!("Physical Drive {}", disk_num));
                    let s = read_cstring(&desc_buf, serial_off);

                    let bus = match raw_bus {
                        0x07 => BusType::Usb,
                        0x11 => BusType::Nvme,
                        0x0B => BusType::Sata,
                        0x01 | 0x02 | 0x03 => BusType::Scsi,
                        0x0C => BusType::Sd,
                        0x0E => BusType::Virtual,
                        _ => BusType::Unknown,
                    };

                    (bus, raw_removable, v, m, s)
                } else {
                    (BusType::Unknown, false, String::new(), format!("Physical Drive {}", disk_num), None)
                };

                // 2. Query Geometry Ex (Total Capacity & Sector Size)
                let mut geom_ex = std::mem::zeroed::<DISK_GEOMETRY_EX>();
                let mut geom_ret = 0u32;
                let geom_res = DeviceIoControl(
                    handle,
                    IOCTL_DISK_GET_DRIVE_GEOMETRY_EX,
                    std::ptr::null(),
                    0,
                    &mut geom_ex as *mut _ as *mut _,
                    std::mem::size_of::<DISK_GEOMETRY_EX>() as u32,
                    &mut geom_ret,
                    std::ptr::null_mut(),
                );

                let (size_bytes, sector_size) = if geom_res != 0 {
                    let disk_size = geom_ex.DiskSize as u64;
                    let bytes_per_sector = geom_ex.Geometry.BytesPerSector;
                    (disk_size, bytes_per_sector)
                } else {
                    (0, 512)
                };

                // 3. Query Partition Layout
                let mut layout_buf = vec![0u8; 4096];
                let mut layout_ret = 0u32;
                let layout_res = DeviceIoControl(
                    handle,
                    IOCTL_DISK_GET_DRIVE_LAYOUT_EX,
                    std::ptr::null(),
                    0,
                    layout_buf.as_mut_ptr() as *mut _,
                    layout_buf.len() as u32,
                    &mut layout_ret,
                    std::ptr::null_mut(),
                );

                let (partition_style, partitions) = if layout_res != 0 && layout_ret >= 8 {
                    // DRIVE_LAYOUT_INFORMATION_EX:
                    // offset 0: PartitionStyle (0 = MBR, 1 = GPT, 2 = RAW)
                    // offset 4: PartitionCount (u32)
                    let style_code = u32::from_ne_bytes(layout_buf[0..4].try_into().unwrap_or([0; 4]));
                    let style = match style_code {
                        0 => PartitionStyle::Mbr,
                        1 => PartitionStyle::Gpt,
                        _ => PartitionStyle::Raw,
                    };

                    (style, Vec::new())
                } else {
                    (PartitionStyle::Raw, Vec::new())
                };

                CloseHandle(handle);

                // 4. Correlate with Mapped Volumes
                let this_volumes: Vec<VolumeInfo> = mapped_volumes
                    .iter()
                    .filter(|v| v.device_number == disk_num)
                    .map(|v| VolumeInfo {
                        drive_letter: Some(v.drive_letter),
                        volume_guid: String::new(),
                        label: format!("Drive {}", v.drive_letter),
                        filesystem: "Unknown".into(),
                        capacity_bytes: 0,
                        free_bytes: 0,
                    })
                    .collect();

                let has_system_volume = mapped_volumes
                    .iter()
                    .any(|v| v.device_number == disk_num && v.is_system_drive);

                // Disk 0 or disk with system volume or NVMe drive is marked system disk
                let is_system = has_system_volume || (disk_num == 0 && bus_type == BusType::Nvme);
                let is_boot = is_system;

                let safety_status = if is_system {
                    SafetyStatus::ProtectedSystem
                } else if !is_removable && bus_type != BusType::Usb && bus_type != BusType::Sd {
                    SafetyStatus::ProtectedSystem
                } else {
                    SafetyStatus::SafeForSelection
                };

                let mut dev = DeviceInfo {
                    device_id: format!("PhysicalDrive{}", disk_num),
                    device_number: disk_num,
                    device_path: dev_path,
                    vendor,
                    model,
                    serial_number,
                    size_bytes,
                    sector_size,
                    bus_type,
                    is_removable: is_removable || bus_type == BusType::Usb,
                    is_system,
                    is_boot,
                    is_readonly: false,
                    is_offline: false,
                    partition_style,
                    partitions,
                    volumes: this_volumes,
                    safety_status,
                    fingerprint: String::new(),
                };

                dev.fingerprint = generate_device_fingerprint(&dev);
                devices.push(dev);
            }
        }

        Ok(devices)
    }

    fn get_device_details(&self, device_id: &str) -> Result<DeviceDetails, StorageError> {
        let list = self.list_devices()?;
        let dev = list
            .into_iter()
            .find(|d| d.device_id == device_id)
            .ok_or_else(|| StorageError::DeviceNotFound(device_id.into()))?;

        Ok(DeviceDetails {
            raw_bus_type_code: match dev.bus_type {
                BusType::Usb => 7,
                BusType::Nvme => 17,
                BusType::Sata => 11,
                BusType::Scsi => 1,
                BusType::Sd => 12,
                _ => 0,
            },
            media_type: if dev.is_removable { "Removable Media".into() } else { "Fixed Hard Disk".into() },
            physical_sector_size: dev.sector_size,
            logical_sector_size: dev.sector_size,
            is_clustered: false,
            device: dev,
        })
    }

    fn eject_device(&self, device_id: &str) -> Result<(), StorageError> {
        let dev_path = format!("\\\\.\\{}", device_id);
        eject_drive(&dev_path)
    }
}

#[cfg(windows)]
fn read_cstring(buf: &[u8], offset: usize) -> Option<String> {
    if offset == 0 || offset >= buf.len() {
        return None;
    }
    let end = buf[offset..].iter().position(|&b| b == 0).unwrap_or(buf.len() - offset);
    let s = String::from_utf8_lossy(&buf[offset..offset + end]).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[cfg(not(windows))]
impl DeviceProvider for WindowsDeviceProvider {
    fn list_devices(&self) -> Result<Vec<DeviceInfo>, StorageError> {
        Ok(Vec::new())
    }
    fn get_device_details(&self, device_id: &str) -> Result<DeviceDetails, StorageError> {
        Err(StorageError::DeviceNotFound(device_id.into()))
    }
    fn eject_device(&self, _device_id: &str) -> Result<(), StorageError> {
        Ok(())
    }
}
