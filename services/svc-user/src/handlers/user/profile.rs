//! 用户资料 handler — 更新个人资料

use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel, Set};
use tonic::Status;
use uuid::Uuid;

use shared::entity::prelude::Users;

use super::user_model_to_proto;

/// 更新用户资料
///
/// user_id 来自 Gateway 透传的 x-user-id metadata（已认证）。
/// 只更新非空字段。
pub async fn update_profile(
    db: &DatabaseConnection,
    user_id: &str,
    display_name: &str,
    avatar_url: &str,
    bio: &str,
) -> Result<shared::proto::User, Status> {
    let uuid = Uuid::parse_str(user_id)
        .map_err(|_| Status::internal("Invalid user_id from auth context"))?;

    // 查询当前用户
    let user_model = Users::find_by_id(uuid)
        .one(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Database query failed")
        })?
        .ok_or_else(|| Status::not_found("User not found"))?;

    // 构建更新
    let mut active: shared::entity::users::ActiveModel = user_model.into_active_model();

    if !display_name.is_empty() {
        active.display_name = Set(display_name.to_string());
    }
    if !avatar_url.is_empty() {
        active.avatar_url = Set(avatar_url.to_string());
    }
    if !bio.is_empty() {
        active.bio = Set(bio.to_string());
    }

    // 更新 updated_at
    active.updated_at = Set(chrono::Utc::now().fixed_offset());

    let updated = active.update(db).await.map_err(|e| {
        tracing::error!(error = %e, "Database update failed");
        Status::internal("Profile update failed")
    })?;

    Ok(user_model_to_proto(updated))
}
