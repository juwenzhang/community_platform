use std::process::Command;

use tracing::{info, warn};

/// 尝试杀掉占用指定端口的进程。
///
/// 仅在 macOS / Linux 上生效（使用 `lsof` + `kill`）。
/// 如果端口未被占用或平台不支持，静默跳过。
pub fn kill_port_holder(port: u16) {
    let output = Command::new("lsof")
        .args(["-ti", &format!(":{port}")])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => {
            warn!(%port, error = %e, "lsof not available, skipping port cleanup");
            return;
        }
    };

    let pids_raw = String::from_utf8_lossy(&output.stdout);
    let pids: Vec<&str> = pids_raw.split_whitespace().collect();

    if pids.is_empty() {
        return; // 端口未被占用
    }

    info!(%port, ?pids, "Port occupied, killing existing process(es)");

    for pid in &pids {
        let _ = Command::new("kill").args(["-9", pid]).output();
    }

    // 短暂等待端口释放
    std::thread::sleep(std::time::Duration::from_millis(300));

    info!(%port, "Port cleanup done");
}
