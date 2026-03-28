//! 事件发布器
//!
//! 封装领域事件发布能力，自动填充 event_id + timestamp，
//! event_type 自动映射到 NATS subject。

use std::sync::Arc;

use prost::Message;
use prost_types::Timestamp;
use tracing::{info, warn};
use uuid::Uuid;

use shared::messaging::NatsClient;
use shared::proto::EventEnvelope;

/// 事件发布器
#[allow(dead_code)]
pub struct EventPublisher {
    nats: Option<Arc<NatsClient>>,
    source: String,
}

#[allow(dead_code)]
impl EventPublisher {
    /// 创建事件发布器
    ///
    /// `source` 标识事件来源，如 "gateway"
    pub fn new(nats: Option<Arc<NatsClient>>, source: &str) -> Self {
        Self {
            nats,
            source: source.to_string(),
        }
    }

    /// 发布领域事件
    ///
    /// `event_type` 如 "user.created"，自动映射为 NATS subject `luhanxin.events.user.created`
    /// `payload` 为具体的 Proto 消息，包装为 `google.protobuf.Any`
    pub async fn publish<T: Message>(
        &self,
        event_type: &str,
        _payload: &T,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let Some(nats) = &self.nats else {
            warn!(event_type = %event_type, "NATS not available, skipping event publish");
            return Ok(());
        };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();

        let envelope = EventEnvelope {
            event_id: Uuid::new_v4().to_string(),
            event_type: event_type.to_string(),
            source: self.source.clone(),
            timestamp: Some(Timestamp {
                seconds: now.as_secs() as i64,
                nanos: now.subsec_nanos() as i32,
            }),
            payload: None, // TODO: 使用 prost_types::Any 包装
            metadata: std::collections::HashMap::new(),
            retry_count: 0,
        };

        let subject = format!("luhanxin.events.{event_type}");

        nats.publish(&subject, &envelope).await.map_err(|e| {
            warn!(error = %e, event_type = %event_type, "Failed to publish event");
            Box::new(e) as Box<dyn std::error::Error + Send + Sync>
        })?;

        info!(
            event_id = %envelope.event_id,
            event_type = %event_type,
            subject = %subject,
            "Published domain event"
        );

        Ok(())
    }
}
