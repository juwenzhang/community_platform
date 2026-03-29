//! ArticleService gRPC 实现
//!
//! 负责请求解析 + 调用 handler + 构造响应。
//! 业务逻辑在 handlers/article/ 中。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::article_service_server::ArticleService;
use shared::proto::{
    CreateArticleRequest, CreateArticleResponse, DeleteArticleRequest, DeleteArticleResponse,
    GetArticleRequest, GetArticleResponse, ListArticlesRequest, ListArticlesResponse,
    UpdateArticleRequest, UpdateArticleResponse,
};

use crate::handlers::article;

/// 数据库不可用时的统一错误
fn db_unavailable() -> Status {
    Status::unavailable("Database not available, service running in degraded mode")
}

/// 从 request metadata 中提取 x-user-id（Gateway 透传的认证用户 ID）
fn extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Result<String, Status> {
    metadata
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing x-user-id metadata"))
}

/// 从 metadata 尝试获取 x-user-id（可选，公开接口不要求）
fn try_extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Option<String> {
    metadata
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// ArticleService gRPC 实现
#[derive(Clone)]
pub struct ArticleServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
}

impl ArticleServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>) -> Self {
        Self { db }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db.as_deref().ok_or_else(db_unavailable)
    }
}

#[tonic::async_trait]
impl ArticleService for ArticleServiceImpl {
    /// 获取文章详情（公开）
    async fn get_article(
        &self,
        request: Request<GetArticleRequest>,
    ) -> Result<Response<GetArticleResponse>, Status> {
        let req = request.into_inner();
        info!(article_id = %req.article_id, "GetArticle");

        let proto_article = article::get_article(self.db()?, &req.article_id).await?;
        Ok(Response::new(GetArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 获取文章列表（公开）
    async fn list_articles(
        &self,
        request: Request<ListArticlesRequest>,
    ) -> Result<Response<ListArticlesResponse>, Status> {
        let caller_id = try_extract_user_id(request.metadata());
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(author_id = %req.author_id, query = %req.query, tag = %req.tag, "ListArticles");

        let (articles, next_page_token, total_count) = article::list_articles(
            self.db()?,
            &req.author_id,
            &req.query,
            &req.tag,
            caller_id.as_deref(),
            pagination.page_size,
            &pagination.page_token,
        )
        .await?;

        Ok(Response::new(ListArticlesResponse {
            articles,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count,
            }),
        }))
    }

    /// 创建文章（需认证）
    async fn create_article(
        &self,
        request: Request<CreateArticleRequest>,
    ) -> Result<Response<CreateArticleResponse>, Status> {
        let author_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(author_id = %author_id, title = %req.title, "CreateArticle");

        let proto_article = article::create_article(
            self.db()?,
            &author_id,
            &req.title,
            &req.content,
            &req.summary,
            &req.tags,
            req.status,
        )
        .await?;

        Ok(Response::new(CreateArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 更新文章（需认证，仅作者）
    async fn update_article(
        &self,
        request: Request<UpdateArticleRequest>,
    ) -> Result<Response<UpdateArticleResponse>, Status> {
        let caller_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(caller_id = %caller_id, article_id = %req.article_id, "UpdateArticle");

        let proto_article = article::update_article(
            self.db()?,
            &caller_id,
            &req.article_id,
            &req.title,
            &req.content,
            &req.summary,
            &req.tags,
            req.status,
        )
        .await?;

        Ok(Response::new(UpdateArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 删除文章（需认证，仅作者，软删除）
    async fn delete_article(
        &self,
        request: Request<DeleteArticleRequest>,
    ) -> Result<Response<DeleteArticleResponse>, Status> {
        let caller_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(caller_id = %caller_id, article_id = %req.article_id, "DeleteArticle");

        article::delete_article(self.db()?, &caller_id, &req.article_id).await?;

        Ok(Response::new(DeleteArticleResponse {}))
    }
}
