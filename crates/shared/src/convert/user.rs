//! users::Model → Proto User 转换

use crate::entity::users;
use crate::proto::{SocialLink, User};

use super::datetime_to_timestamp;

/// Entity Model → Proto User 转换
///
/// 从 `svc-user/src/handlers/user/mod.rs` 迁移，统一维护。
/// social_links 从 JSONB 解析为 Vec<SocialLink>。
pub fn user_model_to_proto(model: users::Model) -> User {
    let social_links = model
        .social_links
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| {
                    let platform = v.get("platform")?.as_str()?.to_string();
                    let url = v.get("url")?.as_str()?.to_string();
                    Some(SocialLink { platform, url })
                })
                .collect()
        })
        .unwrap_or_default();

    User {
        id: model.id.to_string(),
        username: model.username,
        email: model.email,
        display_name: model.display_name,
        avatar_url: model.avatar_url,
        bio: model.bio,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
        company: model.company,
        location: model.location,
        website: model.website,
        social_links,
    }
}
