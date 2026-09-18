use std::collections::VecDeque;
use std::time::Instant;

pub struct SpeedTracker {
    start_time: Instant,
    last_samples: VecDeque<(Instant, u64)>,
    max_samples: usize,
}

impl SpeedTracker {
    pub fn new() -> Self {
        let now = Instant::now();
        let mut samples = VecDeque::with_capacity(10);
        samples.push_back((now, 0));
        Self {
            start_time: now,
            last_samples: samples,
            max_samples: 10,
        }
    }

    pub fn record_progress(&mut self, bytes_written: u64) {
        let now = Instant::now();
        self.last_samples.push_back((now, bytes_written));
        if self.last_samples.len() > self.max_samples {
            self.last_samples.pop_front();
        }
    }

    /// Calculate smoothed speed in bytes per second
    pub fn calculate_speed(&self) -> u64 {
        if self.last_samples.len() < 2 {
            return 0;
        }

        let (first_time, first_bytes) = self.last_samples.front().unwrap();
        let (last_time, last_bytes) = self.last_samples.back().unwrap();

        let elapsed = last_time.duration_since(*first_time).as_secs_f64();
        if elapsed <= 0.001 {
            return 0;
        }

        let bytes_diff = last_bytes.saturating_sub(*first_bytes);
        (bytes_diff as f64 / elapsed) as u64
    }

    /// Calculate ETA in seconds
    pub fn calculate_eta(&self, total_bytes: u64, bytes_written: u64) -> Option<u64> {
        let speed = self.calculate_speed();
        if speed == 0 || bytes_written >= total_bytes {
            return None;
        }

        let remaining = total_bytes.saturating_sub(bytes_written);
        Some(remaining / speed)
    }

    pub fn elapsed_secs(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
}
