use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Info,
    Warning,
    Error,
    Success,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogCategory {
    System,
    Device,
    Image,
    Safety,
    Imaging,
    Restore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub category: LogCategory,
    pub message: String,
    pub details: Option<String>,
}

pub struct ActivityLogger {
    logs: Arc<Mutex<Vec<ActivityEntry>>>,
}

impl ActivityLogger {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn log(&self, level: LogLevel, category: LogCategory, message: impl Into<String>, details: Option<String>) {
        let entry = ActivityEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            level,
            category,
            message: message.into(),
            details,
        };

        if let Ok(mut logs) = self.logs.lock() {
            // Keep maximum of 500 log entries to prevent memory growth
            if logs.len() >= 500 {
                logs.remove(0);
            }
            logs.push(entry);
        }
    }

    pub fn get_logs(&self) -> Vec<ActivityEntry> {
        self.logs.lock().map(|l| l.clone()).unwrap_or_default()
    }

    pub fn clear(&self) {
        if let Ok(mut logs) = self.logs.lock() {
            logs.clear();
        }
    }
}

impl Default for ActivityLogger {
    fn default() -> Self {
        Self::new()
    }
}
