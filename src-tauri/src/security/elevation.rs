#[cfg(windows)]
use windows_sys::Win32::Security::{CheckTokenMembership, AllocateAndInitializeSid, FreeSid, SID_IDENTIFIER_AUTHORITY};
#[cfg(windows)]
use windows_sys::Win32::Foundation::BOOL;

#[cfg(windows)]
const SECURITY_BUILTIN_DOMAIN_RID: u32 = 0x00000020;
#[cfg(windows)]
const DOMAIN_ALIAS_RID_ADMINS: u32 = 0x00000220;

pub fn is_elevated() -> bool {
    #[cfg(windows)]
    unsafe {
        let mut nt_authority = SID_IDENTIFIER_AUTHORITY {
            Value: [0, 0, 0, 0, 0, 5],
        };
        let mut administrators_group = std::ptr::null_mut();
        let status = AllocateAndInitializeSid(
            &mut nt_authority,
            2,
            SECURITY_BUILTIN_DOMAIN_RID,
            DOMAIN_ALIAS_RID_ADMINS,
            0, 0, 0, 0, 0, 0,
            &mut administrators_group,
        );

        if status == 0 {
            return false;
        }

        let mut is_member: BOOL = 0;
        let check = CheckTokenMembership(
            std::ptr::null_mut(),
            administrators_group,
            &mut is_member,
        );

        FreeSid(administrators_group);

        check != 0 && is_member != 0
    }

    #[cfg(not(windows))]
    {
        // On Unix, check if euid is 0
        unsafe { libc::geteuid() == 0 }
    }
}
