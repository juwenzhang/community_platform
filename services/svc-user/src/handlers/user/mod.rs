//! 用户 handler 模块
//!
//! 纯业务逻辑，不依赖 tonic Request/Response 类型。

pub mod auth;
pub mod profile;

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use tonic::Status;
use uuid::Uuid;

use shared::entity::prelude::Users;
use shared::entity::users;
use shared::proto::User;

/// 根据 ID 获取用户
pub async fn get_user_by_id(db: &DatabaseConnection, user_id: &str) -> Result<User, Status> {
    let uuid = Uuid::parse_str(user_id).map_err(|_| {
        Status::invalid_argument(format!(
            "Invalid user ID format: '{user_id}' is not a valid UUID"
        ))
    })?;

    let user_model = Users::find_by_id(uuid)
        .one(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Database query failed")
        })?
        .ok_or_else(|| Status::not_found(format!("User '{user_id}' not found")))?;

    Ok(user_model_to_proto(user_model))
}

/// 根据用户名获取用户（用于个人主页 /user/:username）
pub async fn get_user_by_username(
    db: &DatabaseConnection,
    username: &str,
) -> Result<User, Status> {
    if username.is_empty() {
        return Err(Status::invalid_argument("Username is required"));
    }

    let user_model = Users::find()
        .filter(users::Column::Username.eq(username))
        .one(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Database query failed")
        })?
        .ok_or_else(|| Status::not_found(format!("User '{username}' not found")))?;

    Ok(user_model_to_proto(user_model))
}

/// 用户列表（搜索 + 分页）
///
/// `query` 为空时返回全部用户（按创建时间倒序）。
/// 非空时模糊匹配 username 或 display_name。
pub async fn list_users(
    db: &DatabaseConnection,
    query: &str,
    page_size: i32,
    page_token: &str,
) -> Result<(Vec<User>, String, i32), Status> {
    let limit = page_size.clamp(1, 100) as u64;

    let mut select = Users::find().order_by_desc(users::Column::CreatedAt);

    // 搜索过滤
    if !query.is_empty() {
        let pattern = format!("%{query}%");
        select = select.filter(
            users::Column::Username
                .contains(&pattern)
                .or(users::Column::DisplayName.contains(&pattern)),
        );
    }

    // 游标分页（page_token = 上一页最后一条的 created_at timestamp）
    if !page_token.is_empty() {
        if let Ok(ts) = page_token.parse::<i64>() {
            let cursor_time = chrono::DateTime::from_timestamp(ts, 0)
                .map(|dt| dt.fixed_offset())
                .ok_or_else(|| Status::invalid_argument("Invalid page_token"))?;
            select = select.filter(users::Column::CreatedAt.lt(cursor_time));
        }
    }

    // 多取一条判断是否有下一页
    let models = select
        .limit(limit + 1)
        .all(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Database query failed")
        })?;

    let has_more = models.len() as u64 > limit;
    let results: Vec<_> = models
        .into_iter()
        .take(limit as usize)
        .collect();

    let next_page_token = if has_more {
        results
            .last()
            .map(|m| m.created_at.timestamp().to_string())
            .unwrap_or_default()
    } else {
        String::new()
    };

    let users: Vec<User> = results.into_iter().map(user_model_to_proto).collect();
    let total = users.len() as i32;

    Ok((users, next_page_token, total))
}

/// Entity Model → Proto User 转换
pub fn user_model_to_proto(model: users::Model) -> User {
    User {
        id: model.id.to_string(),
        username: model.username,
        email: model.email,
        display_name: model.display_name,
        avatar_url: model.avatar_url,
        bio: model.bio,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
    }
}

/// chrono DateTime → prost Timestamp 转换
fn datetime_to_timestamp(dt: chrono::DateTime<chrono::FixedOffset>) -> prost_types::Timestamp {
    prost_types::Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}
