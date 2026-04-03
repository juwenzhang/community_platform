//! Gateway BFF 层 — ArticleService 转发
//!
//! 实现 ArticleService trait，所有 RPC 调用经过 InterceptorPipeline 拦截。
//! GetArticle/ListArticles 转发后，批量调 svc-user 获取 author 信息填入 Article.author。

use std::collections::HashSet;
use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::article_service_client::ArticleServiceClient;
use shared::proto::article_service_server::ArticleService;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    Article, CreateArticleRequest, CreateArticleResponse, DeleteArticleRequest,
    DeleteArticleResponse, GetArticleRequest, GetArticleResponse, GetUserRequest,
    ListArticlesRequest, ListArticlesResponse, UpdateArticleRequest, UpdateArticleResponse,
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
        let channel = self.resolver.get_channel(shared::constants::SVC_CONTENT).await?;
        Ok(ArticleServiceClient::new(channel))
    }

    /// 获取 svc-user gRPC client
    async fn user_client(&self) -> Result<UserServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel(shared::constants::SVC_USER).await?;
        Ok(UserServiceClient::new(channel))
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
                req.metadata_mut().insert(shared::constants::METADATA_USER_ID, val);
            }
        }
        req
    }

    /// BFF 聚合：批量获取 author 信息填入文章列表
    async fn fill_authors(&self, articles: &mut [Article]) {
        // 收集去重的 author_id
        let author_ids: HashSet<&str> = articles
            .iter()
            .map(|a| a.author_id.as_str())
            .filter(|id| !id.is_empty())
            .collect();

        if author_ids.is_empty() {
            return;
        }

        // 批量请求 svc-user（逐个 GetUser，后续可优化为 BatchGetUsers）
        let mut user_client = match self.user_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get user client for author info");
                return;
            }
        };

        let mut user_map = std::collections::HashMap::new();
        for author_id in author_ids {
            match user_client
                .get_user(GetUserRequest {
                    user_id: author_id.to_string(),
                })
                .await
            {
                Ok(resp) => {
                    if let Some(user) = resp.into_inner().user {
                        user_map.insert(author_id.to_string(), user);
                    }
                }
                Err(e) => {
                    tracing::warn!(author_id = %author_id, error = %e, "Failed to fetch author");
                }
            }
        }

        // 填充 author 字段
        for article in articles.iter_mut() {
            if let Some(user) = user_map.get(&article.author_id) {
                article.author = Some(user.clone());
            }
        }
    }
}

#[tonic::async_trait]
impl ArticleService for GatewayArticleService {
    /// 获取文章详情（公开 + BFF 聚合 author）
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

        // BFF: 填充 author
        if let Some(ref mut article) = resp.get_mut().article {
            let mut articles = [article.clone()];
            self.fill_authors(&mut articles).await;
            *article = articles.into_iter().next().unwrap_or_default();
        }

        let post_result = Ok(());
        self.pipeline.run_post(&ctx, &post_result).await?;
        Ok(resp)
    }

    /// 获取文章列表（公开 + BFF 聚合 author）
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

        // BFF: 批量填充 author
        self.fill_authors(&mut resp.get_mut().articles).await;

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
