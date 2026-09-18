pub mod commands;
pub mod core;
pub mod errors;
pub mod logging;
pub mod platform;
pub mod security;

#[cfg(test)]
mod tests;

use std::sync::OnceLock;
use logging::{ActivityEntry, ActivityLogger, LogCategory, LogLevel};

static LOGGER: OnceLock<ActivityLogger> = OnceLock::new();

pub mod logging_service {
    use super::*;

    fn get_logger() -> &'static ActivityLogger {
        LOGGER.get_or_init(ActivityLogger::new)
    }

    pub fn log(level: LogLevel, category: LogCategory, message: impl Into<String>, details: Option<String>) {
        get_logger().log(level, category, message, details);
    }

    pub fn get_logs() -> Vec<ActivityEntry> {
        get_logger().get_logs()
    }

    pub fn clear_logs() {
        get_logger().clear();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initial system startup log
    logging_service::log(
        LogLevel::Info,
        LogCategory::System,
        "BootForge storage engine initialized",
        Some(format!("Elevated: {}", security::is_elevated())),
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::device::list_devices,
            commands::device::get_device_details,
            commands::device::eject_device,
            commands::image::analyze_image,
            commands::image::calculate_image_hash,
            commands::image::pick_image_file,
            commands::imaging::validate_target,
            commands::imaging::start_write_operation,
            commands::imaging::cancel_operation,
            commands::restore::inspect_partitions,
            commands::restore::restore_usb,
            commands::settings::get_system_info,
            commands::settings::get_activity_logs,
            commands::settings::clear_activity_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
