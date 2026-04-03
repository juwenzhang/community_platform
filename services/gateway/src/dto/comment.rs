//! 评论相关 DTO

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 评论信息
#[derive(Serialize, ToSchema)]
#[schema(no_recursion)]
pub struct CommentDto {
    pub id: String,
    pub article_id: String,
    pub author_id: String,
    pub content: String,
    pub parent_id: String,
    pub reply_to_id: String,
    pub mentions: Vec<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub author: Option<CommentAuthorDto>,
    pub reply_to_author: Option<CommentAuthorDto>,
    pub replies: Vec<CommentDto>,
}

/// 评论作者（精简版用户信息）
#[derive(Serialize, ToSchema)]
pub struct CommentAuthorDto {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: String,
}

/// 评论列表响应
#[derive(Serialize, ToSchema)]
pub struct ListCommentsDto {
    pub comments: Vec<CommentDto>,
    pub total_count: i32,
}

/// 创建评论请求体
#[derive(Deserialize, ToSchema)]
pub struct CreateCommentBody {
    pub content: String,
    pub parent_id: Option<String>,
    pub reply_to_id: Option<String>,
}

/// 评论列表查询参数
#[derive(Deserialize, ToSchema)]
pub struct ListCommentsQuery {
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
}

/// Proto User → CommentAuthorDto 转换
pub fn user_to_author_dto(u: shared::proto::User) -> CommentAuthorDto {
    CommentAuthorDto {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
    }
}

/// Proto Comment → CommentDto 转换
pub fn proto_comment_to_dto(c: shared::proto::Comment) -> CommentDto {
    CommentDto {
        id: c.id,
        article_id: c.article_id,
        author_id: c.author_id,
        content: c.content,
        parent_id: c.parent_id,
        reply_to_id: c.reply_to_id,
        mentions: c.mentions,
        created_at: c.created_at.map(|t| format!("{}", t.seconds)),
        updated_at: c.updated_at.map(|t| format!("{}", t.seconds)),
        author: c.author.map(user_to_author_dto),
        reply_to_author: c.reply_to_author.map(user_to_author_dto),
        replies: c.replies.into_iter().map(proto_comment_to_dto).collect(),
    }
}
