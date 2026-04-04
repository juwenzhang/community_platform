//! ArticleService gRPC 实现
//!
//! 负责请求解析 + 调用 handler + 构造响应。
//! 业务逻辑在 handlers/article/ 中。
//! Redis Cache-Aside: 文章详情 TTL 5min。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::article_service_server::ArticleService;
use shared::proto::{
    CreateArticleRequest, CreateArticleResponse, DeleteArticleRequest, DeleteArticleResponse,
    GetArticleRequest, GetArticleResponse, ListArticlesRequest, ListArticlesResponse,
    UpdateArticleRequest, UpdateArticleResponse, Article,
};
use shared::redis::RedisPool;
use shared::messaging::NatsClient;
use prost::Message;
use base64::engine::general_purpose;
use base64::Engine;

use crate::handlers::article;

/// 文章详情缓存 TTL（秒）
const ARTICLE_CACHE_TTL: u64 = 300; // 5 minutes

/// 数据库不可用时的统一错误
fn db_unavailable() -> Status {
    Status::unavailable("Database not available, service running in degraded mode")
}

/// 从 request metadata 中提取 x-user-id（Gateway 透传的认证用户 ID）
fn extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Result<String, Status> {
    metadata
        .get(shared::constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing x-user-id metadata"))
}

/// 从 metadata 尝试获取 x-user-id（可选，公开接口不要求）
fn try_extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Option<String> {
    metadata
        .get(shared::constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// 文章缓存 key
fn article_cache_key(article_id: &str) -> String {
    format!("{}{article_id}", shared::constants::REDIS_ARTICLE_KEY_PREFIX)
}

/// ArticleService gRPC 实现
#[derive(Clone)]
pub struct ArticleServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    redis: Option<Arc<RedisPool>>,
    nats: Option<Arc<NatsClient>>,
}

impl ArticleServiceImpl {
    pub fn new(
        db: Option<Arc<DatabaseConnection>>,
        redis: Option<Arc<RedisPool>>,
        nats: Option<Arc<NatsClient>>,
    ) -> Self {
        Self { db, redis, nats }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db.as_deref().ok_or_else(db_unavailable)
    }

    /// Fire-and-forget NATS 事件发布（失败只 log warning）
    fn publish_event(&self, subject: &str, payload: Vec<u8>) {
        if let Some(nats) = &self.nats {
            let nats = nats.clone();
            let subject = subject.to_string();
            tokio::spawn(async move {
                if let Err(e) = nats.publish_bytes(&subject, payload).await {
                    tracing::warn!(error = %e, subject = %subject, "Failed to publish NATS event");
                }
            });
        }
    }

    /// Cache-Aside GET: 先查缓存，miss 查 DB 并回填
    async fn get_article_cached(&self, article_id: &str) -> Result<Article, Status> {
        // 1. 查 Redis 缓存
        if let Some(redis) = &self.redis {
            let key = article_cache_key(article_id);
            if let Some(cached) = redis.get(&key).await {
                // base64 → bytes → prost decode
                if let Ok(bytes) = general_purpose::STANDARD.decode(&cached) {
                    if let Ok(article) = Article::decode(bytes.as_slice()) {
                        return Ok(article);
                    }
                }
            }
        }

        // 2. Cache miss → 查 DB
        let proto_article = article::get_article(self.db()?, article_id).await?;

        // 3. 回填缓存（异步，不阻塞响应）
        if let Some(redis) = &self.redis {
            let key = article_cache_key(article_id);
            let encoded = general_purpose::STANDARD.encode(proto_article.encode_to_vec());
            let redis = redis.clone();
            tokio::spawn(async move {
                redis.set(&key, &encoded, ARTICLE_CACHE_TTL).await;
            });
        }

        Ok(proto_article)
    }

    /// 写操作后失效缓存
    async fn invalidate_article_cache(&self, article_id: &str) {
        if let Some(redis) = &self.redis {
            let key = article_cache_key(article_id);
            redis.del(&[&key]).await;
        }
    }
}

#[tonic::async_trait]
impl ArticleService for ArticleServiceImpl {
    /// 获取文章详情（公开，Cache-Aside）
    async fn get_article(
        &self,
        request: Request<GetArticleRequest>,
    ) -> Result<Response<GetArticleResponse>, Status> {
        let req = request.into_inner();
        info!(article_id = %req.article_id, "GetArticle");

        let proto_article = self.get_article_cached(&req.article_id).await?;
        Ok(Response::new(GetArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 获取文章列表（公开）
    async fn list_articles(
        &self,
        request: Request<ListArticlesRequest>,
    ) -> Result<Response<ListArticlesResponse>, Status> {
        let caller_id = shared::extract::try_extract_user_id(&request);
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(author_id = %req.author_id, query = %req.query, tag = %req.tag, "ListArticles");

        let (articles, next_page_token, total_count) = article::list_articles(
            self.db()?,
            &req.author_id,
            &req.query,
            &req.tag,
            &req.categories,
            caller_id.as_deref(),
            req.sort,
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
        let author_id = shared::extract::extract_user_id(&request)?;
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
            &req.categories,
        )
        .await?;

        // 发布文章创建事件（搜索索引同步）
        self.publish_event(
            shared::constants::NATS_EVENT_CONTENT_PUBLISHED,
            proto_article.encode_to_vec(),
        );

        Ok(Response::new(CreateArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 更新文章（需认证，仅作者）— 写操作后失效缓存
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
            &req.categories,
        )
        .await?;

        // 写操作后主动失效缓存
        self.invalidate_article_cache(&req.article_id).await;

        // 发布文章更新事件（搜索索引同步）
        self.publish_event(
            shared::constants::NATS_EVENT_CONTENT_UPDATED,
            proto_article.encode_to_vec(),
        );

        Ok(Response::new(UpdateArticleResponse {
            article: Some(proto_article),
        }))
    }

    /// 删除文章（需认证，仅作者，软删除）— 写操作后失效缓存
    async fn delete_article(
        &self,
        request: Request<DeleteArticleRequest>,
    ) -> Result<Response<DeleteArticleResponse>, Status> {
        let caller_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(caller_id = %caller_id, article_id = %req.article_id, "DeleteArticle");

        article::delete_article(self.db()?, &caller_id, &req.article_id).await?;

        // 写操作后主动失效缓存
        self.invalidate_article_cache(&req.article_id).await;

        // 发布文章删除事件（搜索索引移除）
        let payload = serde_json::json!({"article_id": req.article_id});
        self.publish_event(
            shared::constants::NATS_EVENT_CONTENT_DELETED,
            serde_json::to_vec(&payload).unwrap_or_default(),
        );

        Ok(Response::new(DeleteArticleResponse {}))
    }
}
