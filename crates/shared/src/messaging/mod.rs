//! NATS 消息模块
//!
//! 封装 `async-nats` 客户端，提供 Protobuf 编码的消息发布/订阅能力。
//! 消息体使用 `prost::Message` trait 编解码。

use prost::Message;
use tracing::info;

/// NATS 客户端封装
#[derive(Debug, Clone)]
pub struct NatsClient {
    client: async_nats::Client,
}

/// NATS 客户端错误
#[derive(Debug, thiserror::Error)]
pub enum NatsError {
    #[error("Failed to connect to NATS: {0}")]
    Connect(#[from] async_nats::ConnectError),

    #[error("Failed to publish message: {0}")]
    Publish(#[from] async_nats::PublishError),

    #[error("Failed to subscribe: {0}")]
    Subscribe(#[from] async_nats::SubscribeError),

    #[error("Failed to decode message: {0}")]
    Decode(#[from] prost::DecodeError),
}

impl NatsClient {
    /// 连接 NATS 服务器
    ///
    /// `url` 如 "nats://localhost:4222"
    pub async fn connect(url: &str) -> Result<Self, NatsError> {
        let client = async_nats::connect(url).await?;
        info!(url = %url, "Connected to NATS");
        Ok(Self { client })
    }

    /// 发布 Protobuf 编码的消息
    ///
    /// 将 `prost::Message` 序列化为 bytes 后发送到指定 subject。
    pub async fn publish<T: Message>(
        &self,
        subject: &str,
        message: &T,
    ) -> Result<(), NatsError> {
        let bytes = message.encode_to_vec();
        self.client
            .publish(subject.to_string(), bytes.into())
            .await?;
        Ok(())
    }

    /// 发布原始字节消息
    pub async fn publish_bytes(
        &self,
        subject: &str,
        payload: Vec<u8>,
    ) -> Result<(), NatsError> {
        self.client
            .publish(subject.to_string(), payload.into())
            .await?;
        Ok(())
    }

    /// 订阅指定 subject
    ///
    /// 支持通配符：`*` 匹配单个 token，`>` 匹配剩余所有。
    /// 如 `luhanxin.events.user.>` 匹配所有 user 域事件。
    pub async fn subscribe(
        &self,
        subject: &str,
    ) -> Result<async_nats::Subscriber, NatsError> {
        let subscriber = self.client.subscribe(subject.to_string()).await?;
        info!(subject = %subject, "Subscribed to NATS subject");
        Ok(subscriber)
    }

    /// 获取底层 async_nats::Client（用于高级操作）
    pub fn inner(&self) -> &async_nats::Client {
        &self.client
    }

    /// Fire-and-forget 事件发布（失败只 log warning，不影响调用方）
    ///
    /// 在 tokio::spawn 中异步发布，调用方无需 await。
    /// 适用于业务操作成功后的事件通知（通知、搜索索引同步等）。
    pub fn publish_fire_and_forget(self: &std::sync::Arc<Self>, subject: &str, payload: Vec<u8>) {
        let nats = self.clone();
        let subject = subject.to_string();
        tokio::spawn(async move {
            if let Err(e) = nats.publish_bytes(&subject, payload).await {
                tracing::warn!(error = %e, subject = %subject, "Failed to publish NATS event (fire-and-forget)");
            }
        });
    }
}

/// 从 NATS 消息中解码 Protobuf 消息
pub fn decode_message<T: Message + Default>(
    msg: &async_nats::Message,
) -> Result<T, NatsError> {
    let decoded = T::decode(msg.payload.as_ref())?;
    Ok(decoded)
}
