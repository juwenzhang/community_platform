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

use crate::handlers::social;

fn db_unavailable() -> Status {
    Status::unavailable("Database not available, service running in degraded mode")
}

fn extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Result<String, Status> {
    metadata
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing x-user-id metadata"))
}

fn try_extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Option<String> {
    metadata
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

#[derive(Clone)]
pub struct SocialServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
}

impl SocialServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>) -> Self {
        Self { db }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db.as_deref().ok_or_else(db_unavailable)
    }
}

#[tonic::async_trait]
impl SocialService for SocialServiceImpl {
    async fn like_article(
        &self,
        request: Request<LikeArticleRequest>,
    ) -> Result<Response<LikeArticleResponse>, Status> {
        let user_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "LikeArticle");

        let like_count = social::like_article(self.db()?, &user_id, &req.article_id).await?;
        Ok(Response::new(LikeArticleResponse { like_count }))
    }

    async fn unlike_article(
        &self,
        request: Request<UnlikeArticleRequest>,
    ) -> Result<Response<UnlikeArticleResponse>, Status> {
        let user_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "UnlikeArticle");

        let like_count = social::unlike_article(self.db()?, &user_id, &req.article_id).await?;
        Ok(Response::new(UnlikeArticleResponse { like_count }))
    }

    async fn favorite_article(
        &self,
        request: Request<FavoriteArticleRequest>,
    ) -> Result<Response<FavoriteArticleResponse>, Status> {
        let user_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "FavoriteArticle");

        let favorite_count =
            social::favorite_article(self.db()?, &user_id, &req.article_id).await?;
        Ok(Response::new(FavoriteArticleResponse { favorite_count }))
    }

    async fn unfavorite_article(
        &self,
        request: Request<UnfavoriteArticleRequest>,
    ) -> Result<Response<UnfavoriteArticleResponse>, Status> {
        let user_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(user_id = %user_id, article_id = %req.article_id, "UnfavoriteArticle");

        let favorite_count =
            social::unfavorite_article(self.db()?, &user_id, &req.article_id).await?;
        Ok(Response::new(UnfavoriteArticleResponse { favorite_count }))
    }

    async fn get_article_interaction(
        &self,
        request: Request<GetArticleInteractionRequest>,
    ) -> Result<Response<GetArticleInteractionResponse>, Status> {
        let user_id = try_extract_user_id(request.metadata());
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
        let user_id = extract_user_id(request.metadata())?;
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
