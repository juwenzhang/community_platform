//! articles::Model → Proto Article 转换

use crate::entity::articles;
use crate::proto::Article;

use super::{datetime_to_timestamp, optional_datetime_to_timestamp};

/// Entity Model → Proto Article 转换
///
/// 从 `svc-content/src/handlers/article/mod.rs` 迁移，统一维护。
/// `author` 字段置为 None，由 Gateway BFF 层填充。
pub fn article_model_to_proto(model: articles::Model) -> Article {
    Article {
        id: model.id.to_string(),
        title: model.title,
        slug: model.slug,
        summary: model.summary,
        content: model.content,
        author_id: model.author_id.to_string(),
        tags: model.tags,
        view_count: model.view_count,
        like_count: model.like_count,
        status: model.status as i32,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
        published_at: optional_datetime_to_timestamp(model.published_at),
        author: None, // Gateway BFF 层填充
        categories: model.categories.iter().map(|&c| c as i32).collect(),
        comment_count: 0, // Gateway BFF 层聚合填充
        favorite_count: 0, // Gateway BFF 层从 social service 聚合填充
    }
}
