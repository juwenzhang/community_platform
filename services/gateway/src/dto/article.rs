//! 文章相关 DTO

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::user::{UserDto, user_to_dto};

/// 文章信息
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ArticleDto {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub summary: String,
    pub content: String,
    pub author_id: String,
    pub tags: Vec<String>,
    pub view_count: i32,
    pub like_count: i32,
    pub status: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub published_at: Option<String>,
    pub author: Option<UserDto>,
}

/// 获取文章响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetArticleDto {
    pub article: Option<ArticleDto>,
}

/// 文章列表响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ListArticlesDto {
    pub articles: Vec<ArticleDto>,
    pub next_page_token: String,
    pub total_count: i32,
}

/// 文章列表查询参数
#[derive(Deserialize, ToSchema)]
pub struct ListArticlesQuery {
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
    pub author_id: Option<String>,
    pub query: Option<String>,
    pub tag: Option<String>,
    pub categories: Option<Vec<i32>>,
    /// 排序方式：0=推荐(默认), 1=推荐, 2=最新
    pub sort: Option<i32>,
}

/// 创建文章请求
#[derive(Deserialize, ToSchema)]
pub struct CreateArticleDto {
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<i32>,
    pub categories: Option<Vec<i32>>,
}

/// 更新文章请求
#[derive(Deserialize, ToSchema)]
pub struct UpdateArticleDto {
    pub title: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<i32>,
    pub categories: Option<Vec<i32>>,
}

/// Proto Article → ArticleDto 转换
pub fn proto_to_article_dto(a: shared::proto::Article) -> ArticleDto {
    ArticleDto {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        content: a.content,
        author_id: a.author_id,
        tags: a.tags,
        view_count: a.view_count,
        like_count: a.like_count,
        status: a.status,
        created_at: a.created_at.map(|t| format!("{}", t.seconds)),
        updated_at: a.updated_at.map(|t| format!("{}", t.seconds)),
        published_at: a.published_at.map(|t| format!("{}", t.seconds)),
        author: a.author.map(user_to_dto),
    }
}
