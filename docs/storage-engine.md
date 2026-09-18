# BootForge Windows Storage Engine

## 1. Win32 Low-Level Storage Interfaces

BootForge does not rely on high-level wrappers or third-party drivers. It interfaces directly with Windows kernel storage drivers through the Win32 subsystem.

### 1.1 Volume Locking & Dismounting Sequence
Before raw block access can occur on Windows, existing filesystems holding handles to the drive must be detached. Windows Explorer or background indexers will otherwise block raw writes with `ERROR_ACCESS_DENIED (5)`.

1. **Enumerate Volumes**: Find all volume GUIDs associated with the target physical drive number using `QueryDosDeviceW` and mount point APIs.
2. **Open Volume Handle**:
   ```c
   HANDLE hVol = CreateFileW(
       volumePath,
       GENERIC_READ | GENERIC_WRITE,
       FILE_SHARE_READ | FILE_SHARE_WRITE,
       NULL,
       OPEN_EXISTING,
       0,
       NULL
   );
   ```
3. **Lock Volume**: Issue `FSCTL_LOCK_VOLUME (0x00090018)` via `DeviceIoControl`. This gives exclusive write rights and prevents applications from creating new handles.
4. **Dismount Volume**: Issue `FSCTL_DISMOUNT_VOLUME (0x00090020)` via `DeviceIoControl`. This instructs the filesystem driver (NTFS/FAT/FAT32/exFAT) to release all in-memory metadata caches and invalidate active file handles.

---

## 2. Streaming Direct I/O & Memory Constraints

### 2.1 Direct Sector Writes (`CreateFileW`)
The physical drive handle is acquired:
```c
HANDLE hDisk = CreateFileW(
    L"\\\\.\\PhysicalDriveX",
    GENERIC_READ | GENERIC_WRITE,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    NULL,
    OPEN_EXISTING,
    0, // Raw streaming
    NULL
);
```

### 2.2 Constant $O(1)$ Memory Usage
- Raw ISO files can range from 1 GB (Alpine/Arch) to 8+ GB (Windows 11).
- BootForge allocates a single reusable aligned block buffer (default 2 MB or 4 MB).
- Data is read from the source file in chunk streams and immediately committed to the disk handle via `WriteFile`.
- Maximum RAM consumption is strictly bounded to $O(1)$ constant memory regardless of the ISO file size.

### 2.3 Explicit Cache Flushing
Flash memory devices contain internal write buffers that can falsely report completion while blocks remain queued in volatile NAND controller cache:
- Upon finishing the write stream, BootForge issues `FlushFileBuffers(hDisk)` to ensure the controller has physically committed all blocks to non-volatile flash cells before reporting completion or beginning readback verification.

---

## 3. Post-Write Verification Engine
1. Resets source file pointer and disk handle pointer to sector offset 0.
2. Streams through the exact number of bytes written in chunks.
3. Computes rolling SHA-256 digests of the source image vs. data read back from the physical device.
4. Reports verification progress and validates 100% byte equivalence.

---

## 4. USB Restoration Engine
To reclaim a previously flashed bootable drive:
1. Locks and dismounts all existing volumes.
2. Zeroes the first 2,048 sectors (1 MB) to erase Primary MBR / GPT headers.
3. Zeroes the last 2,048 sectors of the drive to erase Secondary / Backup GPT headers.
4. Creates a new single MBR primary partition spanning the full device capacity.
5. Invokes Windows format provider to create clean FAT32, exFAT, or NTFS filesystem with user-specified volume label.
6. Issues `IOCTL_DISK_UPDATE_PROPERTIES` to force Windows Shell to reload drive geometry and assign a drive letter.
