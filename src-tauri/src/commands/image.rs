use crate::core::image::{analyze_image as core_analyze, compute_sha256_streaming, ImageMetadata};
use crate::errors::StorageError;

#[tauri::command]
pub async fn analyze_image(path: String) -> Result<ImageMetadata, StorageError> {
    tokio::task::spawn_blocking(move || core_analyze(path))
        .await
        .map_err(|e| StorageError::OperationFailed(e.to_string()))?
}

#[tauri::command]
pub async fn calculate_image_hash(path: String) -> Result<String, StorageError> {
    tokio::task::spawn_blocking(move || {
        compute_sha256_streaming::<_, fn(u64, u64)>(path, None, None)
    })
    .await
    .map_err(|e| StorageError::OperationFailed(e.to_string()))?
}

#[cfg(windows)]
#[repr(C)]
#[allow(non_snake_case)]
struct OPENFILENAMEW {
    lStructSize: u32,
    hwndOwner: *mut std::ffi::c_void,
    hInstance: *mut std::ffi::c_void,
    lpstrFilter: *const u16,
    lpstrCustomFilter: *mut u16,
    nMaxCustFilter: u32,
    nFilterIndex: u32,
    lpstrFile: *mut u16,
    nMaxFile: u32,
    lpstrFileTitle: *mut u16,
    nMaxFileTitle: u32,
    lpstrInitialDir: *const u16,
    lpstrTitle: *const u16,
    Flags: u32,
    nFileOffset: u16,
    nFileExtension: u16,
    lpstrDefExt: *const u16,
    lCustData: isize,
    lpfnHook: *mut std::ffi::c_void,
    lpTemplateName: *const u16,
    pvReserved: *mut std::ffi::c_void,
    dwReserved: u32,
    FlagsEx: u32,
}

#[cfg(windows)]
#[link(name = "comdlg32")]
extern "system" {
    fn GetOpenFileNameW(lpofn: *mut OPENFILENAMEW) -> i32;
}

#[tauri::command]
pub async fn pick_image_file() -> Result<Option<String>, StorageError> {
    tokio::task::spawn_blocking(|| {
        #[cfg(windows)]
        {
            let mut filter: Vec<u16> = Vec::new();
            filter.extend("Disk Images (*.iso;*.img;*.bin;*.raw)\0".encode_utf16());
            filter.extend("*.iso;*.img;*.bin;*.raw\0".encode_utf16());
            filter.extend("All Files (*.*)\0".encode_utf16());
            filter.extend("*.*\0\0".encode_utf16());

            let title: Vec<u16> = "Select Operating System Image (ISO, IMG, RAW)\0"
                .encode_utf16()
                .collect();

            let mut file_buf = vec![0u16; 1024];

            let mut ofn: OPENFILENAMEW = unsafe { std::mem::zeroed() };
            ofn.lStructSize = std::mem::size_of::<OPENFILENAMEW>() as u32;
            ofn.lpstrFilter = filter.as_ptr();
            ofn.lpstrFile = file_buf.as_mut_ptr();
            ofn.nMaxFile = file_buf.len() as u32;
            ofn.lpstrTitle = title.as_ptr();
            // OFN_FILEMUSTEXIST (0x1000) | OFN_PATHMUSTEXIST (0x800) | OFN_EXPLORER (0x80000) | OFN_NOCHANGEDIR (0x8)
            ofn.Flags = 0x00001000 | 0x00000800 | 0x00080000 | 0x00000008;

            let result = unsafe { GetOpenFileNameW(&mut ofn) };
            if result != 0 {
                let len = file_buf.iter().position(|&c| c == 0).unwrap_or(file_buf.len());
                let path = String::from_utf16_lossy(&file_buf[..len]);
                if path.trim().is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(path))
                }
            } else {
                Ok(None)
            }
        }

        #[cfg(not(windows))]
        {
            Ok(None)
        }
    })
    .await
    .map_err(|e| StorageError::OperationFailed(e.to_string()))?
}
