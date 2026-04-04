//! SocialService gRPC 实现

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::social_service_server::SocialService;
use shared::proto::{
    FavoriteArticleRequest, FavoriteArticleResponse, GetArticleInteractionRequest,
    GetArticleInteractionResponse, LikeArticleRequest, LikeArticleResponse,
    ListFavoritesRequest, ListFavoritesResponse, UnfavoriteArticleRequest,
    UnfavoriteArticleResponse, UnlikeArticleRequest, UnlikeArticleResponse,
};

use shared::redis::RedisPool;
use shared::messaging::NatsClient;

use crate::handlers::social;

#[derive(Clone)]
pub struct SocialServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    redis: Option<Arc<RedisPool>>,
    nats: Option<Arc<NatsClient>>,
}

impl SocialServiceImpl {
    pub fn new(
        db: Option<Arc<DatabaseConnection>>,
        redis: Option<Arc<RedisPool>>,
        nats: Option<Arc<NatsClient>>,
    ) -> Self {
        Self { db, redis, nats }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db
            .as_deref()
            .ok_or_else(shared::extract::db_unavailable)
    }

    /// Fire-and-forget NATS 事件发布
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

    /// 失效文章缓存（点赞/收藏改变了 like_count/favorite_count）
    async fn invalidate_article_cache(&self, article_id: &str) {
        if let Some(redis) = &self.redis {
            let key = format!("{}{article_id}", shared::constants::REDIS_ARTICLE_KEY_PREFIX);
            redis.del(&[&key]).await;
        }
    }
}

#[tonic::async_trait]
impl SocialService for SocialServiceImpl {
    async fn like_article(
        &self,
        request: Request<LikeArticleRequest>,
    ) -> Result<Response<LikeArticleResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "LikeArticle");

        let like_count = social::like_article(self.db()?, &user_id, &req.article_id).await?;

        // 发布点赞事件（通知 + 缓存失效）
        let payload = serde_json::json!({"article_id": req.article_id, "user_id": user_id});
        self.publish_event(
            shared::constants::NATS_EVENT_SOCIAL_LIKED,
            serde_json::to_vec(&payload).unwrap_or_default(),
        );
        self.invalidate_article_cache(&req.article_id).await;

        Ok(Response::new(LikeArticleResponse { like_count }))
    }

    async fn unlike_article(
        &self,
        request: Request<UnlikeArticleRequest>,
    ) -> Result<Response<UnlikeArticleResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "UnlikeArticle");

        let like_count = social::unlike_article(self.db()?, &user_id, &req.article_id).await?;
        self.invalidate_article_cache(&req.article_id).await;

        Ok(Response::new(UnlikeArticleResponse { like_count }))
    }

    async fn favorite_article(
        &self,
        request: Request<FavoriteArticleRequest>,
    ) -> Result<Response<FavoriteArticleResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "FavoriteArticle");

        let favorite_count =
            social::favorite_article(self.db()?, &user_id, &req.article_id).await?;

        // 发布收藏事件（通知）
        let payload = serde_json::json!({"article_id": req.article_id, "user_id": user_id});
        self.publish_event(
            shared::constants::NATS_EVENT_SOCIAL_FAVORITED,
            serde_json::to_vec(&payload).unwrap_or_default(),
        );
        self.invalidate_article_cache(&req.article_id).await;

        Ok(Response::new(FavoriteArticleResponse { favorite_count }))
    }

    async fn unfavorite_article(
        &self,
        request: Request<UnfavoriteArticleRequest>,
    ) -> Result<Response<UnfavoriteArticleResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "UnfavoriteArticle");

        let favorite_count =
            social::unfavorite_article(self.db()?, &user_id, &req.article_id).await?;
        self.invalidate_article_cache(&req.article_id).await;

        Ok(Response::new(UnfavoriteArticleResponse { favorite_count }))
    }

    async fn get_article_interaction(
        &self,
        request: Request<GetArticleInteractionRequest>,
    ) -> Result<Response<GetArticleInteractionResponse>, Status> {
        let user_id = shared::extract::try_extract_user_id(&request);
        let req = request.into_inner();
        info!(article_id = %req.article_id, "GetArticleInteraction");

        let (liked, favorited, like_count, favorite_count) =
            social::get_article_interaction(self.db()?, user_id.as_deref(), &req.article_id)
                .await?;

        Ok(Response::new(GetArticleInteractionResponse {
            liked,
            favorited,
            like_count,
            favorite_count,
        }))
    }

    async fn list_favorites(
        &self,
        request: Request<ListFavoritesRequest>,
    ) -> Result<Response<ListFavoritesResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(user_id = %user_id, "ListFavorites");

        let (articles, next_page_token, total_count) = social::list_favorites(
            self.db()?,
            &user_id,
            pagination.page_size,
            &pagination.page_token,
        )
        .await?;

        Ok(Response::new(ListFavoritesResponse {
            articles,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count,
            }),
        }))
    }
}
