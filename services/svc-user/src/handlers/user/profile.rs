//! 用户资料 handler — 更新个人资料
//!
//! 全量覆盖语义：前端发送所有字段当前值，后端直接覆盖。

use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel, Set};
use serde_json::json;
use tonic::Status;
use uuid::Uuid;

use shared::entity::prelude::Users;
use shared::proto::SocialLink;

use super::user_model_to_proto;

/// 允许的社交平台列表
const ALLOWED_PLATFORMS: &[&str] = &[
    "github", "twitter", "weibo", "linkedin", "juejin", "zhihu", "bilibili", "website",
];

/// 最大社交链接数
const MAX_SOCIAL_LINKS: usize = 10;

/// 校验 URL 基本格式
fn is_valid_url(url: &str) -> bool {
    url.starts_with("http://") || url.starts_with("https://")
}

/// 校验社交链接列表
fn validate_social_links(links: &[SocialLink]) -> Result<(), Status> {
    if links.len() > MAX_SOCIAL_LINKS {
        return Err(Status::invalid_argument(format!(
            "Too many social links (max {MAX_SOCIAL_LINKS})"
        )));
    }

    for link in links {
        if !ALLOWED_PLATFORMS.contains(&link.platform.as_str()) {
            return Err(Status::invalid_argument(format!(
                "Unknown platform '{}'. Allowed: {}",
                link.platform,
                ALLOWED_PLATFORMS.join(", ")
            )));
        }
        if !link.url.is_empty() && !is_valid_url(&link.url) {
            return Err(Status::invalid_argument(format!(
                "Invalid URL for platform '{}': must start with http:// or https://",
                link.platform
            )));
        }
    }

    Ok(())
}

/// 更新用户资料（全量覆盖）
///
/// user_id 来自 Gateway 透传的 x-user-id metadata（已认证）。
/// 所有字段直接覆盖，前端负责发送完整的当前值。
pub async fn update_profile(
    db: &DatabaseConnection,
    user_id: &str,
    display_name: &str,
    avatar_url: &str,
    bio: &str,
    company: &str,
    location: &str,
    website: &str,
    social_links: &[SocialLink],
) -> Result<shared::proto::User, Status> {
    // 校验社交链接
    validate_social_links(social_links)?;

    // 校验 website URL（如果非空）
    if !website.is_empty() && !is_valid_url(website) {
        return Err(Status::invalid_argument(
            "Invalid website URL: must start with http:// or https://",
        ));
    }

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

    // 全量覆盖所有字段
    let mut active: shared::entity::users::ActiveModel = user_model.into_active_model();

    active.display_name = Set(display_name.to_string());
    active.avatar_url = Set(avatar_url.to_string());
    active.bio = Set(bio.to_string());
    active.company = Set(company.to_string());
    active.location = Set(location.to_string());
    active.website = Set(website.to_string());

    // social_links → JSONB
    let links_json: serde_json::Value = json!(
        social_links
            .iter()
            .filter(|l| !l.url.is_empty())
            .map(|l| json!({"platform": l.platform, "url": l.url}))
            .collect::<Vec<_>>()
    );
    active.social_links = Set(links_json);

    active.updated_at = Set(chrono::Utc::now().fixed_offset());

    let updated = active.update(db).await.map_err(|e| {
        tracing::error!(error = %e, "Database update failed");
        Status::internal("Profile update failed")
    })?;

    Ok(user_model_to_proto(updated))
}
