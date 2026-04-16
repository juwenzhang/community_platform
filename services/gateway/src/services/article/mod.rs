//! Gateway BFF 层 — ArticleService 转发
//!
//! 实现 ArticleService trait，所有 RPC 调用经过 InterceptorPipeline 拦截。
//! GetArticle/ListArticles 转发后，通过 `enrich_articles` 并发聚合：
//!   - author（svc-user）
//!   - comment_count（svc-content CommentService）
//!   - favorite_count（svc-content SocialService）

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::article_service_client::ArticleServiceClient;
use shared::proto::article_service_server::ArticleService;
use shared::proto::comment_service_client::CommentServiceClient;
use shared::proto::social_service_client::SocialServiceClient;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    Article, CreateArticleRequest, CreateArticleResponse, DeleteArticleRequest,
    DeleteArticleResponse, GetArticleInteractionRequest, GetArticleRequest, GetArticleResponse,
    GetUserRequest, ListArticlesRequest, ListArticlesResponse, ListCommentsRequest,
    UpdateArticleRequest, UpdateArticleResponse,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

#[derive(Clone)]
pub struct GatewayArticleService {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

impl GatewayArticleService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }

    /// 获取 svc-content gRPC client
    async fn article_client(
        &self,
    ) -> Result<ArticleServiceClient<tonic::transport::Channel>, Status> {
        let channel = self
            .resolver
            .get_channel(shared::constants::SVC_CONTENT)
            .await?;
        Ok(ArticleServiceClient::new(channel))
    }

    /// 获取 svc-user gRPC client
    async fn user_client(&self) -> Result<UserServiceClient<tonic::transport::Channel>, Status> {
        let channel = self
            .resolver
            .get_channel(shared::constants::SVC_USER)
            .await?;
        Ok(UserServiceClient::new(channel))
    }

    /// 获取 svc-content comment gRPC client
    async fn comment_client(
        &self,
    ) -> Result<CommentServiceClient<tonic::transport::Channel>, Status> {
        let channel = self
            .resolver
            .get_channel(shared::constants::SVC_CONTENT)
            .await?;
        Ok(CommentServiceClient::new(channel))
    }

    /// 获取 social gRPC client (svc-content 中的 SocialService)
    async fn social_client(
        &self,
    ) -> Result<SocialServiceClient<tonic::transport::Channel>, Status> {
        let channel = self
            .resolver
            .get_channel(shared::constants::SVC_CONTENT)
            .await?;
        Ok(SocialServiceClient::new(channel))
    }

    /// 为需认证的方法：从 ctx.attrs 提取 user_id，设置到下游 request metadata
    fn inject_user_id<T>(ctx: &RpcContext, inner: T) -> Result<Request<T>, Status> {
        let user_id = ctx
            .attrs
            .get("user_id")
            .ok_or_else(|| Status::unauthenticated("Missing user_id in auth context"))?;

        let mut req = Request::new(inner);
        req.metadata_mut().insert(
            shared::constants::METADATA_USER_ID,
            user_id
                .parse()
                .map_err(|_| Status::internal("Invalid user_id format"))?,
        );
        Ok(req)
    }

    /// 为公开方法：如果有 user_id（可选认证），也传给下游
    fn inject_optional_user_id<T>(ctx: &RpcContext, inner: T) -> Request<T> {
        let mut req = Request::new(inner);
        if let Some(user_id) = ctx.attrs.get("user_id") {
            if let Ok(val) = user_id.parse() {
                req.metadata_mut()
                    .insert(shared::constants::METADATA_USER_ID, val);
            }
        }
        req
    }

    // ──────────────────────────────────────────────────────────
    // BFF 聚合：一次性并发填充 author + comment_count + favorite_count
    // ──────────────────────────────────────────────────────────

    /// 并发聚合所有文章的 BFF 元数据
    ///
    /// 三个下游调用并发执行（tokio::join!），每个内部做批量/逐篇查询。
    /// 任一下游失败只 warn 不阻断，保证降级返回。
    async fn enrich_articles(&self, articles: &mut [Article]) {
        if articles.is_empty() {
            return;
        }

        // 收集所有 article_id（用于 comment + favorite 查询）
        let article_ids: Vec<String> = articles
            .iter()
            .filter(|a| !a.id.is_empty())
            .map(|a| a.id.clone())
            .collect();

        // 收集去重 author_id（用于 user 查询）
        let author_ids: HashSet<String> = articles
            .iter()
            .map(|a| a.author_id.clone())
            .filter(|id| !id.is_empty())
            .collect();

        // 并发获取三种数据
        let (author_map, comment_map, favorite_map) = tokio::join!(
            self.fetch_authors(author_ids),
            self.fetch_comment_counts(&article_ids),
            self.fetch_favorite_counts(&article_ids),
        );

        // 一次遍历填充所有字段
        for article in articles.iter_mut() {
            if let Some(user) = author_map.get(&article.author_id) {
                article.author = Some(user.clone());
            }
            if let Some(&count) = comment_map.get(&article.id) {
                article.comment_count = count;
            }
            if let Some(&count) = favorite_map.get(&article.id) {
                article.favorite_count = count;
            }
        }
    }

    /// 批量获取作者信息 → HashMap<author_id, User>
    async fn fetch_authors(
        &self,
        author_ids: HashSet<String>,
    ) -> HashMap<String, shared::proto::User> {
        let mut map = HashMap::new();
        if author_ids.is_empty() {
            return map;
        }

        let mut client = match self.user_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get user client");
                return map;
            }
        };

        // TODO: 优化为 BatchGetUsers RPC，减少 N 次调用
        for author_id in author_ids {
            match client
                .get_user(GetUserRequest {
                    user_id: author_id.clone(),
                })
                .await
            {
                Ok(resp) => {
                    if let Some(user) = resp.into_inner().user {
                        map.insert(author_id, user);
                    }
                }
                Err(e) => {
                    tracing::warn!(author_id = %author_id, error = %e, "Failed to fetch author");
                }
            }
        }
        map
    }

    /// 批量获取评论数 → HashMap<article_id, count>
    async fn fetch_comment_counts(&self, article_ids: &[String]) -> HashMap<String, i32> {
        let mut map = HashMap::new();
        if article_ids.is_empty() {
            return map;
        }

        let mut client = match self.comment_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get comment client");
                return map;
            }
        };

        // TODO: 优化为 BatchGetCommentCounts RPC
        for id in article_ids {
            match client
                .list_comments(ListCommentsRequest {
                    article_id: id.clone(),
                    pagination: Some(shared::proto::PaginationRequest {
                        page_size: 0, // 只要 total_count，不取数据
                        page_token: String::new(),
                    }),
                    sort: 0,
                    cursor: String::new(),
                })
                .await
            {
                Ok(resp) => {
                    let count = resp
                        .into_inner()
                        .pagination
                        .map(|p| p.total_count)
                        .unwrap_or(0);
                    map.insert(id.clone(), count);
                }
                Err(e) => {
                    tracing::warn!(article_id = %id, error = %e, "Failed to fetch comment count");
                }
            }
        }
        map
    }

    /// 批量获取收藏数 → HashMap<article_id, count>
    async fn fetch_favorite_counts(&self, article_ids: &[String]) -> HashMap<String, i32> {
        let mut map = HashMap::new();
        if article_ids.is_empty() {
            return map;
        }

        let mut client = match self.social_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get social client");
                return map;
            }
        };

        // TODO: 优化为 BatchGetInteractions RPC
        for id in article_ids {
            match client
                .get_article_interaction(GetArticleInteractionRequest {
                    article_id: id.clone(),
                })
                .await
            {
                Ok(resp) => {
                    map.insert(id.clone(), resp.into_inner().favorite_count);
                }
                Err(e) => {
                    tracing::warn!(article_id = %id, error = %e, "Failed to fetch favorite count");
                }
            }
        }
        map
    }
}

#[tonic::async_trait]
impl ArticleService for GatewayArticleService {
    /// 获取文章详情（公开 + BFF 聚合）
    async fn get_article(
        &self,
        request: Request<GetArticleRequest>,
    ) -> Result<Response<GetArticleResponse>, Status> {
        info!("Gateway: GetArticle");
        let mut ctx = RpcContext::new("article", "get_article");
        self.pipeline
            .run_pre(&mut ctx, request.metadata())
            .await?;

        let inner = request.into_inner();
        let mut resp = self.article_client().await?.get_article(inner).await?;

        // BFF: 直接在 &mut Article 上聚合，无需 clone
        if let Some(ref mut article) = resp.get_mut().article {
            self.enrich_articles(std::slice::from_mut(article)).await;
        }

        let post_result = Ok(());
        self.pipeline.run_post(&ctx, &post_result).await?;
        Ok(resp)
    }

    /// 获取文章列表（公开 + BFF 聚合）
    async fn list_articles(
        &self,
        request: Request<ListArticlesRequest>,
    ) -> Result<Response<ListArticlesResponse>, Status> {
        info!("Gateway: ListArticles");
        let mut ctx = RpcContext::new("article", "list_articles");
        self.pipeline
            .run_pre(&mut ctx, request.metadata())
            .await?;

        let inner = request.into_inner();
        let downstream_req = Self::inject_optional_user_id(&ctx, inner);
        let mut resp = self
            .article_client()
            .await?
            .list_articles(downstream_req)
            .await?;

        // BFF: 并发聚合 author + comment_count + favorite_count
        self.enrich_articles(&mut resp.get_mut().articles).await;

        let post_result = Ok(());
        self.pipeline.run_post(&ctx, &post_result).await?;
        Ok(resp)
    }

    /// 创建文章（需认证）
    async fn create_article(
        &self,
        request: Request<CreateArticleRequest>,
    ) -> Result<Response<CreateArticleResponse>, Status> {
        info!("Gateway: CreateArticle");
        let mut ctx = RpcContext::new("article", "create_article");
        self.pipeline
            .run_pre(&mut ctx, request.metadata())
            .await?;

        let inner = request.into_inner();
        let downstream_req = Self::inject_user_id(&ctx, inner)?;
        let result = self
            .article_client()
            .await?
            .create_article(downstream_req)
            .await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }

    /// 更新文章（需认证）
    async fn update_article(
        &self,
        request: Request<UpdateArticleRequest>,
    ) -> Result<Response<UpdateArticleResponse>, Status> {
        info!("Gateway: UpdateArticle");
        let mut ctx = RpcContext::new("article", "update_article");
        self.pipeline
            .run_pre(&mut ctx, request.metadata())
            .await?;

        let inner = request.into_inner();
        let downstream_req = Self::inject_user_id(&ctx, inner)?;
        let result = self
            .article_client()
            .await?
            .update_article(downstream_req)
            .await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }

    /// 删除文章（需认证）
    async fn delete_article(
        &self,
        request: Request<DeleteArticleRequest>,
    ) -> Result<Response<DeleteArticleResponse>, Status> {
        info!("Gateway: DeleteArticle");
        let mut ctx = RpcContext::new("article", "delete_article");
        self.pipeline
            .run_pre(&mut ctx, request.metadata())
            .await?;

        let inner = request.into_inner();
        let downstream_req = Self::inject_user_id(&ctx, inner)?;
        let result = self
            .article_client()
            .await?
            .delete_article(downstream_req)
            .await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }
}
