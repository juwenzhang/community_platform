use sea_orm::{DatabaseConnection, EntityTrait};
use tonic::Status;
use uuid::Uuid;

use shared::entity::prelude::Users;
use shared::proto::User;

/// 根据 ID 获取用户
///
/// 从 PostgreSQL 查询用户数据，转换为 Proto 类型返回。
pub async fn get_user_by_id(db: &DatabaseConnection, user_id: &str) -> Result<User, Status> {
    // 1. 解析 UUID
    let uuid = Uuid::parse_str(user_id).map_err(|_| {
        Status::invalid_argument(format!("Invalid user ID format: '{user_id}' is not a valid UUID"))
    })?;

    // 2. 查询数据库
    let user_model = Users::find_by_id(uuid)
        .one(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Database query failed")
        })?
        .ok_or_else(|| Status::not_found(format!("User '{user_id}' not found")))?;

    // 3. Entity → Proto 转换
    Ok(user_model_to_proto(user_model))
}

/// Entity Model → Proto User 转换
fn user_model_to_proto(model: shared::entity::users::Model) -> User {
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
