//! NotificationService gRPC 实现
//!
//! 负责请求解析 + 调用 handler + 构造响应。
//! Redis 缓存未读计数（TTL 1min）。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::notification_service_server::NotificationService;
use shared::proto::{
    GetUnreadCountRequest, GetUnreadCountResponse, ListNotificationsRequest,
    ListNotificationsResponse, MarkAllAsReadRequest, MarkAllAsReadResponse, MarkAsReadRequest,
    MarkAsReadResponse, Notification, NotificationTargetType, NotificationType,
};
use shared::redis::RedisPool;

use crate::handlers::notification;

/// 未读计数缓存 TTL（秒）
const UNREAD_COUNT_CACHE_TTL: u64 = 60; // 1 minute

/// 未读计数缓存 key
fn unread_count_cache_key(user_id: &str) -> String {
    format!("{}{user_id}", shared::constants::REDIS_NOTIFICATION_UNREAD_KEY_PREFIX)
}

/// notification model → proto Notification（简化版，不填充 actor/target_title）
fn model_to_proto(m: shared::entity::notifications::Model) -> Notification {
    let ntype = match m.r#type.as_str() {
        "comment" => NotificationType::Comment,
        "like" => NotificationType::Like,
        "favorite" => NotificationType::Favorite,
        _ => NotificationType::Unspecified,
    };
    let ttype = match m.target_type.as_str() {
        "article" => NotificationTargetType::Article,
        "comment" => NotificationTargetType::Comment,
        _ => NotificationTargetType::Unspecified,
    };

    Notification {
        id: m.id.to_string(),
        user_id: m.user_id.to_string(),
        r#type: ntype as i32,
        actor_id: m.actor_id.to_string(),
        target_type: ttype as i32,
        target_id: m.target_id.to_string(),
        is_read: m.is_read,
        created_at: Some(shared::convert::datetime_to_timestamp(m.created_at)),
        actor: None,
        target_title: String::new(),
    }
}

#[derive(Clone)]
pub struct NotificationServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    redis: Option<Arc<RedisPool>>,
}

impl NotificationServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>, redis: Option<Arc<RedisPool>>) -> Self {
        Self { db, redis }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db
            .as_deref()
            .ok_or_else(shared::extract::db_unavailable)
    }

    /// 失效未读计数缓存
    async fn invalidate_unread_cache(&self, user_id: &str) {
        if let Some(redis) = &self.redis {
            let key = unread_count_cache_key(user_id);
            redis.del(&[&key]).await;
        }
    }
}

#[tonic::async_trait]
impl NotificationService for NotificationServiceImpl {
    async fn list_notifications(
        &self,
        request: Request<ListNotificationsRequest>,
    ) -> Result<Response<ListNotificationsResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(user_id = %user_id, "ListNotifications");

        let (models, next_page_token, total_count) = notification::list_notifications(
            self.db()?,
            &user_id,
            pagination.page_size,
            &pagination.page_token,
        )
        .await?;

        let notifications: Vec<Notification> = models.into_iter().map(model_to_proto).collect();

        Ok(Response::new(ListNotificationsResponse {
            notifications,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count,
            }),
        }))
    }

    async fn get_unread_count(
        &self,
        request: Request<GetUnreadCountRequest>,
    ) -> Result<Response<GetUnreadCountResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        info!(user_id = %user_id, "GetUnreadCount");

        // 先查 Redis 缓存
        if let Some(redis) = &self.redis {
            let key = unread_count_cache_key(&user_id);
            if let Some(cached) = redis.get(&key).await {
                if let Ok(count) = cached.parse::<i32>() {
                    return Ok(Response::new(GetUnreadCountResponse { count }));
                }
            }
        }

        let count = notification::get_unread_count(self.db()?, &user_id).await?;

        // 回填缓存
        if let Some(redis) = &self.redis {
            let key = unread_count_cache_key(&user_id);
            redis.set(&key, &count.to_string(), UNREAD_COUNT_CACHE_TTL).await;
        }

        Ok(Response::new(GetUnreadCountResponse { count }))
    }

    async fn mark_as_read(
        &self,
        request: Request<MarkAsReadRequest>,
    ) -> Result<Response<MarkAsReadResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, notification_id = %req.notification_id, "MarkAsRead");

        notification::mark_as_read(self.db()?, &user_id, &req.notification_id).await?;
        self.invalidate_unread_cache(&user_id).await;

        Ok(Response::new(MarkAsReadResponse {}))
    }

    async fn mark_all_as_read(
        &self,
        request: Request<MarkAllAsReadRequest>,
    ) -> Result<Response<MarkAllAsReadResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        info!(user_id = %user_id, "MarkAllAsRead");

        let count = notification::mark_all_as_read(self.db()?, &user_id).await?;
        self.invalidate_unread_cache(&user_id).await;

        Ok(Response::new(MarkAllAsReadResponse { count }))
    }
}
