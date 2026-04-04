//! NATS 事件消费 worker
//!
//! 订阅 `luhanxin.events.content.>` 和 `luhanxin.events.social.>` 事件，
//! 解析 payload，创建通知记录。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tracing::{info, warn};
use uuid::Uuid;

use shared::messaging::NatsClient;
use shared::redis::RedisPool;

use crate::handlers::notification;

/// 启动 NATS 事件消费者（后台 tokio task）
pub async fn start_event_consumer(
    nats: Arc<NatsClient>,
    db: Arc<DatabaseConnection>,
    redis: Arc<RedisPool>,
) {
    // 订阅评论事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_CONTENT_COMMENTED).await {
        let db = db.clone();
        let redis = redis.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("NATS consumer started: content.commented");
            while let Some(msg) = sub.next().await {
                handle_comment_event(&db, &redis, &msg.payload).await;
            }
        });
    }

    // 订阅点赞事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_SOCIAL_LIKED).await {
        let db = db.clone();
        let redis = redis.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("NATS consumer started: social.liked");
            while let Some(msg) = sub.next().await {
                handle_social_event(&db, &redis, &msg.payload, "like").await;
            }
        });
    }

    // 订阅收藏事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_SOCIAL_FAVORITED).await {
        let db = db.clone();
        let redis = redis.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("NATS consumer started: social.favorited");
            while let Some(msg) = sub.next().await {
                handle_social_event(&db, &redis, &msg.payload, "favorite").await;
            }
        });
    }

    info!("All NATS event consumers started");
}

/// 处理评论事件 → 创建通知（通知文章作者 + 被回复的评论作者）
async fn handle_comment_event(db: &DatabaseConnection, redis: &RedisPool, payload: &[u8]) {
    let Ok(event) = serde_json::from_slice::<serde_json::Value>(payload) else {
        warn!("Failed to parse comment event payload");
        return;
    };

    let article_id = event["article_id"].as_str().unwrap_or_default();
    let author_id = event["author_id"].as_str().unwrap_or_default();
    let reply_to_id = event["reply_to_id"].as_str().unwrap_or_default();

    let Ok(actor_uuid) = Uuid::parse_str(author_id) else { return };
    let Ok(target_uuid) = Uuid::parse_str(article_id) else { return };

    // 1. 通知文章作者（顶级评论 + 回复都通知）
    if let Some(article_author_id) = get_article_author(db, article_id).await {
        if let Err(e) = notification::create_notification(
            db, article_author_id, "comment", actor_uuid, "article", target_uuid,
        ).await {
            warn!(error = %e, "Failed to create comment notification for article author");
        } else {
            invalidate_unread_cache(redis, &article_author_id.to_string()).await;
        }
    }

    // 2. 如果是回复别人的评论，额外通知被回复者
    if !reply_to_id.is_empty() {
        if let Some(reply_author_id) = get_comment_author(db, reply_to_id).await {
            // 避免重复通知（被回复者 == 文章作者时已通知过）
            // target 仍然用 article_id，这样前端点击通知能正确跳转到文章
            if let Err(e) = notification::create_notification(
                db, reply_author_id, "comment", actor_uuid, "article", target_uuid,
            ).await {
                warn!(error = %e, "Failed to create reply notification");
            } else {
                invalidate_unread_cache(redis, &reply_author_id.to_string()).await;
            }
        }
    }
}

/// 处理社交事件（点赞/收藏）→ 创建通知
async fn handle_social_event(
    db: &DatabaseConnection,
    redis: &RedisPool,
    payload: &[u8],
    event_type: &str,
) {
    let Ok(event) = serde_json::from_slice::<serde_json::Value>(payload) else {
        warn!("Failed to parse social event payload");
        return;
    };

    let article_id = event["article_id"].as_str().unwrap_or_default();
    let user_id = event["user_id"].as_str().unwrap_or_default();

    let article_author_id = get_article_author(db, article_id).await;
    let Some(article_author_id) = article_author_id else {
        return;
    };

    let Ok(actor_uuid) = Uuid::parse_str(user_id) else { return };
    let Ok(target_uuid) = Uuid::parse_str(article_id) else { return };

    if let Err(e) = notification::create_notification(
        db,
        article_author_id,
        event_type,
        actor_uuid,
        "article",
        target_uuid,
    )
    .await
    {
        warn!(error = %e, "Failed to create {} notification", event_type);
    } else {
        invalidate_unread_cache(redis, &article_author_id.to_string()).await;
    }
}

// ────────────────────── 辅助函数 ──────────────────────

/// 失效未读计数缓存
async fn invalidate_unread_cache(redis: &RedisPool, user_id: &str) {
    let key = format!("{}{user_id}", shared::constants::REDIS_NOTIFICATION_UNREAD_KEY_PREFIX);
    redis.del(&[&key]).await;
}

/// 根据文章 ID 获取文章作者 ID
async fn get_article_author(db: &DatabaseConnection, article_id: &str) -> Option<Uuid> {
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
    use shared::entity::articles;
    use shared::entity::prelude::Articles;

    let uuid = Uuid::parse_str(article_id).ok()?;
    let article = Articles::find_by_id(uuid).one(db).await.ok()??;
    Some(article.author_id)
}

/// 根据评论 ID 获取评论作者 ID
async fn get_comment_author(db: &DatabaseConnection, comment_id: &str) -> Option<Uuid> {
    use sea_orm::EntityTrait;
    use shared::entity::prelude::Comments;

    let uuid = Uuid::parse_str(comment_id).ok()?;
    let comment = Comments::find_by_id(uuid).one(db).await.ok()??;
    Some(comment.author_id)
}
