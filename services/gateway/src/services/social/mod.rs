//! Gateway BFF 层 — SocialService 透传
//!
//! 直接转发到 svc-content，经过 InterceptorPipeline 拦截。

use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::social_service_client::SocialServiceClient;
use shared::proto::social_service_server::SocialService;
use shared::proto::{
    FavoriteArticleRequest, FavoriteArticleResponse, GetArticleInteractionRequest,
    GetArticleInteractionResponse, LikeArticleRequest, LikeArticleResponse,
    ListFavoritesRequest, ListFavoritesResponse, UnfavoriteArticleRequest,
    UnfavoriteArticleResponse, UnlikeArticleRequest, UnlikeArticleResponse,
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
        let channel = self.resolver.get_channel("svc-content").await?;
        Ok(SocialServiceClient::new(channel))
    }

    fn inject_user_id<T>(ctx: &RpcContext, inner: T) -> Result<Request<T>, Status> {
        let mut req = Request::new(inner);
        if let Some(user_id) = ctx.attrs.get("user_id") {
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }
        }
        Ok(req)
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
        // 可选认证（未登录也能看计数，只是 liked/favorited 为 false）
        let _ = self.pipeline.run_pre(&mut ctx, &metadata).await;
        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: GetArticleInteraction");
        let req = Self::inject_user_id(&ctx, inner)?;
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
        Ok(client.list_favorites(req).await?)
    }
}
