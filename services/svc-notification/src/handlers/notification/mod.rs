//! 通知 handler 模块
//!
//! 纯业务逻辑，不依赖 tonic Request/Response 类型。

use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect,
};
use tonic::Status;
use uuid::Uuid;

use shared::entity::notifications;
use shared::entity::prelude::Notifications;
use shared::extract::{db_error, parse_uuid};
use shared::proto::{Notification, NotificationType, NotificationTargetType};

/// 创建通知（被 NATS 消费者调用）
pub async fn create_notification(
    db: &DatabaseConnection,
    user_id: Uuid,
    notification_type: &str,
    actor_id: Uuid,
    target_type: &str,
    target_id: Uuid,
) -> Result<(), sea_orm::DbErr> {
    // 自我操作不生成通知
    if user_id == actor_id {
        return Ok(());
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now().fixed_offset();

    let active_model = notifications::ActiveModel {
        id: ActiveValue::Set(id),
        user_id: ActiveValue::Set(user_id),
        r#type: ActiveValue::Set(notification_type.to_string()),
        actor_id: ActiveValue::Set(actor_id),
        target_type: ActiveValue::Set(target_type.to_string()),
        target_id: ActiveValue::Set(target_id),
        is_read: ActiveValue::Set(false),
        created_at: ActiveValue::Set(now),
    };

    active_model.insert(db).await?;
    Ok(())
}

/// 获取通知列表（分页，按时间倒序）
pub async fn list_notifications(
    db: &DatabaseConnection,
    user_id: &str,
    page_size: i32,
    page_token: &str,
) -> Result<(Vec<notifications::Model>, String, i32), Status> {
    let user_uuid = parse_uuid(user_id)?;
    let limit = page_size.clamp(1, 100) as u64;

    let base_query = Notifications::find()
        .filter(notifications::Column::UserId.eq(user_uuid))
        .order_by_desc(notifications::Column::CreatedAt);

    let total_count = base_query.clone().count(db).await.map_err(db_error)? as i32;

    let mut paginated = base_query;
    if !page_token.is_empty() {
        if let Ok(ts) = page_token.parse::<i64>() {
            let cursor_time = chrono::DateTime::from_timestamp(ts, 0)
                .map(|dt| dt.fixed_offset())
                .ok_or_else(|| Status::invalid_argument("Invalid page_token"))?;
            paginated = paginated.filter(notifications::Column::CreatedAt.lt(cursor_time));
        }
    }

    let models = paginated.limit(limit + 1).all(db).await.map_err(db_error)?;
    let has_more = models.len() as u64 > limit;
    let results: Vec<_> = models.into_iter().take(limit as usize).collect();

    let next_page_token = if has_more {
        results
            .last()
            .map(|m| m.created_at.timestamp().to_string())
            .unwrap_or_default()
    } else {
        String::new()
    };

    Ok((results, next_page_token, total_count))
}

/// 获取未读通知数量
pub async fn get_unread_count(
    db: &DatabaseConnection,
    user_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;

    let count = Notifications::find()
        .filter(notifications::Column::UserId.eq(user_uuid))
        .filter(notifications::Column::IsRead.eq(false))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    Ok(count)
}

/// 标记单条通知已读
pub async fn mark_as_read(
    db: &DatabaseConnection,
    user_id: &str,
    notification_id: &str,
) -> Result<(), Status> {
    let user_uuid = parse_uuid(user_id)?;
    let notif_uuid = parse_uuid(notification_id)?;

    let model = Notifications::find_by_id(notif_uuid)
        .filter(notifications::Column::UserId.eq(user_uuid))
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found("Notification not found"))?;

    let mut active: notifications::ActiveModel = model.into();
    active.is_read = ActiveValue::Set(true);
    active.update(db).await.map_err(db_error)?;

    Ok(())
}

/// 标记全部已读，返回受影响的数量
pub async fn mark_all_as_read(
    db: &DatabaseConnection,
    user_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;

    use sea_orm::sea_query::Expr;
    let result = Notifications::update_many()
        .filter(notifications::Column::UserId.eq(user_uuid))
        .filter(notifications::Column::IsRead.eq(false))
        .col_expr(notifications::Column::IsRead, Expr::value(true))
        .exec(db)
        .await
        .map_err(db_error)?;

    Ok(result.rows_affected as i32)
}
