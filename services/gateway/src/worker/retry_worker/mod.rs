//! NATS 重试 Worker
//!
//! 订阅 `luhanxin.retry.>` 消费重试请求。
//! 指数退避：1s → 2s → 4s，最大 3 次，超过进死信队列。

use std::sync::Arc;
use std::time::Duration;

use tokio::task::JoinHandle;
use tracing::{error, info, warn};

use shared::messaging::NatsClient;

/// 启动重试 Worker
///
/// 返回 JoinHandle，后台持续运行直到进程退出。
pub fn spawn_retry_worker(nats: Arc<NatsClient>) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut subscriber = match nats.subscribe("luhanxin.retry.>").await {
            Ok(s) => s,
            Err(e) => {
                error!(error = %e, "Failed to subscribe to retry queue, worker exiting");
                return;
            }
        };

        info!("RetryWorker started, listening on luhanxin.retry.>");

        while let Some(msg) = futures::StreamExt::next(&mut subscriber).await {
            let subject = msg.subject.to_string();

            // 解析重试上下文
            let payload: serde_json::Value = match serde_json::from_slice(&msg.payload) {
                Ok(v) => v,
                Err(e) => {
                    warn!(error = %e, subject = %subject, "Failed to parse retry payload");
                    continue;
                }
            };

            let retry_count = payload["retry_count"].as_u64().unwrap_or(0) as u32;
            let max_retries = payload["max_retries"].as_u64().unwrap_or(3) as u32;
            let service = payload["service"].as_str().unwrap_or("unknown");
            let method = payload["method"].as_str().unwrap_or("unknown");

            if retry_count >= max_retries {
                // 超过最大重试次数 → 死信队列
                let deadletter_subject = format!("luhanxin.deadletter.{service}");
                error!(
                    service = %service,
                    method = %method,
                    retry_count = retry_count,
                    "Max retries exceeded, moving to dead letter queue"
                );

                if let Err(e) = nats
                    .publish_bytes(&deadletter_subject, msg.payload.to_vec())
                    .await
                {
                    error!(error = %e, "Failed to publish to dead letter queue");
                }
                continue;
            }

            // 指数退避等待
            let backoff = Duration::from_secs(1u64 << retry_count); // 1s, 2s, 4s
            info!(
                service = %service,
                method = %method,
                retry_count = retry_count + 1,
                backoff_secs = backoff.as_secs(),
                "Retrying after backoff"
            );
            tokio::time::sleep(backoff).await;

            // TODO: 实际重新调用 gRPC（需要 ServiceResolver）
            // 当前版本只记录日志，后续集成实际重试逻辑
            warn!(
                service = %service,
                method = %method,
                retry_count = retry_count + 1,
                "Retry execution placeholder — actual gRPC retry not yet implemented"
            );

            // 递增 retry_count 重新入队
            let mut updated = payload.clone();
            updated["retry_count"] = serde_json::Value::from(retry_count + 1);
            let bytes = serde_json::to_vec(&updated).unwrap_or_default();
            if let Err(e) = nats.publish_bytes(&subject, bytes).await {
                error!(error = %e, "Failed to re-enqueue retry request");
            }
        }
    })
}
