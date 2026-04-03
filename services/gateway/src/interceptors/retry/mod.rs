//! 重试拦截器
//!
//! Post 拦截器：当 gRPC 调用失败（UNAVAILABLE / DEADLINE_EXCEEDED）时，
//! 将请求写入 NATS 重试队列做异步补偿。

use std::sync::Arc;

use tonic::Status;
use tracing::{info, warn};

use shared::messaging::NatsClient;

use super::{PostInterceptor, RpcContext};

/// 重试拦截器
///
/// NATS 为 Option — 如果 NATS 不可达则跳过重试（graceful degradation）。
pub struct RetryInterceptor {
    nats: Option<Arc<NatsClient>>,
}

impl RetryInterceptor {
    pub fn new(nats: Option<Arc<NatsClient>>) -> Self {
        Self { nats }
    }
}

#[tonic::async_trait]
impl PostInterceptor for RetryInterceptor {
    async fn intercept(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status> {
        // 只处理失败情况
        let status = match result {
            Ok(()) => return Ok(()),
            Err(s) => s,
        };

        // 只对 UNAVAILABLE 和 DEADLINE_EXCEEDED 触发重试
        let should_retry = matches!(
            status.code(),
            tonic::Code::Unavailable | tonic::Code::DeadlineExceeded
        );

        if !should_retry {
            return Ok(());
        }

        let Some(nats) = &self.nats else {
            warn!(
                service = %ctx.service,
                method = %ctx.method,
                "NATS not available, skipping retry enqueue"
            );
            return Ok(());
        };

        // 构建重试 subject: <NATS_RETRY_PREFIX>.<service>.<method>
        let subject = format!("{}.{}.{}", shared::constants::NATS_RETRY_PREFIX, ctx.service, ctx.method);

        // 构建 RetryRequest（简化版：使用 JSON 编码上下文信息）
        let retry_payload = serde_json::json!({
            "service": ctx.service,
            "method": ctx.method,
            "error": status.message(),
            "retry_count": 0,
            "max_retries": 3,
        });

        let bytes = serde_json::to_vec(&retry_payload).unwrap_or_default();

        match nats.publish_bytes(&subject, bytes).await {
            Ok(()) => {
                info!(
                    subject = %subject,
                    service = %ctx.service,
                    method = %ctx.method,
                    "Enqueued retry request to NATS"
                );
            }
            Err(e) => {
                warn!(
                    error = %e,
                    service = %ctx.service,
                    method = %ctx.method,
                    "Failed to enqueue retry request (NATS error), skipping"
                );
            }
        }

        Ok(())
    }
}
