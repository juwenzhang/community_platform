//! Gateway BFF 层 — SocialService
//!
//! 转发到 svc-content，经过 InterceptorPipeline 拦截。
//! ListFavorites 转发后，批量调 svc-user 获取文章作者信息填入 Article.author。

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::social_service_client::SocialServiceClient;
use shared::proto::social_service_server::SocialService;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    Article, FavoriteArticleRequest, FavoriteArticleResponse, GetArticleInteractionRequest,
    GetArticleInteractionResponse, GetUserRequest, LikeArticleRequest, LikeArticleResponse,
    ListFavoritesRequest, ListFavoritesResponse, UnfavoriteArticleRequest,
    UnfavoriteArticleResponse, UnlikeArticleRequest, UnlikeArticleResponse, User,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

#[derive(Clone)]
pub struct GatewaySocialService {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

impl GatewaySocialService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }

    async fn client(&self) -> Result<SocialServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel(shared::constants::SVC_CONTENT).await?;
        Ok(SocialServiceClient::new(channel))
    }

    async fn user_client(&self) -> Result<UserServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel(shared::constants::SVC_USER).await?;
        Ok(UserServiceClient::new(channel))
    }

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

    fn inject_optional_user_id<T>(ctx: &RpcContext, inner: T) -> Request<T> {
        let mut req = Request::new(inner);
        if let Some(user_id) = ctx.attrs.get("user_id") {
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert(shared::constants::METADATA_USER_ID, val);
            }
        }
        req
    }

    /// BFF 聚合：批量获取文章作者信息
    async fn fill_article_authors(&self, articles: &mut [Article]) {
        let author_ids: HashSet<&str> = articles
            .iter()
            .map(|a| a.author_id.as_str())
            .filter(|id| !id.is_empty())
            .collect();

        if author_ids.is_empty() {
            return;
        }

        let mut user_client = match self.user_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get user client for article authors");
                return;
            }
        };

        let mut user_map: HashMap<String, User> = HashMap::new();
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
                    tracing::warn!(author_id = %author_id, error = %e, "Failed to fetch article author");
                }
            }
        }

        for article in articles {
            if let Some(user) = user_map.get(&article.author_id) {
                article.author = Some(user.clone());
            }
        }
    }
}

#[tonic::async_trait]
impl SocialService for GatewaySocialService {
    async fn like_article(
        &self,
        request: Request<LikeArticleRequest>,
    ) -> Result<Response<LikeArticleResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "like_article");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: LikeArticle");
        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        Ok(client.like_article(req).await?)
    }

    async fn unlike_article(
        &self,
        request: Request<UnlikeArticleRequest>,
    ) -> Result<Response<UnlikeArticleResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "unlike_article");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: UnlikeArticle");
        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        Ok(client.unlike_article(req).await?)
    }

    async fn favorite_article(
        &self,
        request: Request<FavoriteArticleRequest>,
    ) -> Result<Response<FavoriteArticleResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "favorite_article");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: FavoriteArticle");
        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        Ok(client.favorite_article(req).await?)
    }

    async fn unfavorite_article(
        &self,
        request: Request<UnfavoriteArticleRequest>,
    ) -> Result<Response<UnfavoriteArticleResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "unfavorite_article");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: UnfavoriteArticle");
        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        Ok(client.unfavorite_article(req).await?)
    }

    async fn get_article_interaction(
        &self,
        request: Request<GetArticleInteractionRequest>,
    ) -> Result<Response<GetArticleInteractionResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "get_article_interaction");
        let _ = self.pipeline.run_pre(&mut ctx, &metadata).await;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: GetArticleInteraction");
        let req = Self::inject_optional_user_id(&ctx, inner);
        let mut client = self.client().await?;
        Ok(client.get_article_interaction(req).await?)
    }

    async fn list_favorites(
        &self,
        request: Request<ListFavoritesRequest>,
    ) -> Result<Response<ListFavoritesResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("social", "list_favorites");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;
        let inner = request.into_inner();
        info!("gRPC: ListFavorites");
        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        let mut resp = client.list_favorites(req).await?.into_inner();

        // BFF 聚合：填充文章作者信息
        self.fill_article_authors(&mut resp.articles).await;

        Ok(Response::new(resp))
    }
}
