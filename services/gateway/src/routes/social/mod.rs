//! 社交互动 REST Proxy

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;

use shared::proto::social_service_client::SocialServiceClient;
use shared::proto::{
    FavoriteArticleRequest, GetArticleInteractionRequest, LikeArticleRequest,
    ListFavoritesRequest, UnfavoriteArticleRequest, UnlikeArticleRequest,
};

use crate::dto::common::status_to_response;
use crate::dto::article::proto_to_article_dto;
use crate::dto::social::{
    FavoriteResponseDto, InteractionDto, LikeResponseDto,
};
use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

use super::helpers;

// Re-export for Swagger
pub use crate::dto::social::{
    InteractionDto as InteractionDtoSchema, LikeResponseDto as LikeResponseDtoSchema,
    FavoriteResponseDto as FavoriteResponseDtoSchema,
};
pub use crate::dto::common::ApiError;

// ──── 共享状态 + Helpers ────

#[derive(Clone)]
pub struct SocialRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<SocialServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel(shared::constants::SVC_CONTENT)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(SocialServiceClient::new(channel))
}

// ──── Handlers ────

/// 点赞文章
#[utoipa::path(
    post,
    path = "/api/v1/articles/{id}/like",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "点赞成功", body = LikeResponseDto),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "社交"
)]
pub async fn like_article(
    State(state): State<SocialRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "like_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(LikeArticleRequest { article_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.like_article(req).await {
                Ok(resp) => {
                    let dto = LikeResponseDto { like_count: resp.into_inner().like_count };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

/// 取消点赞
#[utoipa::path(
    delete,
    path = "/api/v1/articles/{id}/like",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "取消点赞成功", body = LikeResponseDto),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "社交"
)]
pub async fn unlike_article(
    State(state): State<SocialRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "unlike_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(UnlikeArticleRequest { article_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.unlike_article(req).await {
                Ok(resp) => {
                    let dto = LikeResponseDto { like_count: resp.into_inner().like_count };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

/// 收藏文章
#[utoipa::path(
    post,
    path = "/api/v1/articles/{id}/favorite",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "收藏成功", body = FavoriteResponseDto),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "社交"
)]
pub async fn favorite_article(
    State(state): State<SocialRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "favorite_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(FavoriteArticleRequest { article_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.favorite_article(req).await {
                Ok(resp) => {
                    let dto = FavoriteResponseDto { favorite_count: resp.into_inner().favorite_count };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

/// 取消收藏
#[utoipa::path(
    delete,
    path = "/api/v1/articles/{id}/favorite",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "取消收藏成功", body = FavoriteResponseDto),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "社交"
)]
pub async fn unfavorite_article(
    State(state): State<SocialRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "unfavorite_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(UnfavoriteArticleRequest { article_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.unfavorite_article(req).await {
                Ok(resp) => {
                    let dto = FavoriteResponseDto { favorite_count: resp.into_inner().favorite_count };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

/// 获取文章互动状态
#[utoipa::path(
    get,
    path = "/api/v1/articles/{id}/interaction",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "互动状态", body = InteractionDto),
    ),
    tag = "社交"
)]
pub async fn get_interaction(
    State(state): State<SocialRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "get_interaction");
    let _ = state.pipeline.run_pre(&mut ctx, &metadata).await; // 可选认证

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(GetArticleInteractionRequest { article_id: id });
            if let Some(user_id) = ctx.attrs.get("user_id") {
                helpers::inject_user_id_metadata(&mut req, user_id);
            }
            match client.get_article_interaction(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let dto = InteractionDto {
                        liked: inner.liked,
                        favorited: inner.favorited,
                        like_count: inner.like_count,
                        favorite_count: inner.favorite_count,
                    };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

/// 获取收藏列表
#[utoipa::path(
    get,
    path = "/api/v1/user/favorites",
    responses(
        (status = 200, description = "收藏列表"),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "社交"
)]
pub async fn list_favorites(
    State(state): State<SocialRouterState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "list_favorites");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(ListFavoritesRequest {
                pagination: Some(shared::proto::PaginationRequest {
                    page_size: shared::constants::DEFAULT_PAGE_SIZE,
                    page_token: String::new(),
                }),
            });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.list_favorites(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let articles: Vec<_> = inner.articles.into_iter().map(proto_to_article_dto).collect();
                    let total_count = inner.pagination.map(|p| p.total_count).unwrap_or(0);
                    Json(serde_json::json!({"articles": articles, "total_count": total_count})).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

// ──── Router 构建 ────

pub fn social_rest_router(
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
) -> axum::Router {
    let state = SocialRouterState { resolver, pipeline };
    axum::Router::new()
        .route("/api/v1/articles/{id}/like", axum::routing::post(like_article).delete(unlike_article))
        .route("/api/v1/articles/{id}/favorite", axum::routing::post(favorite_article).delete(unfavorite_article))
        .route("/api/v1/articles/{id}/interaction", axum::routing::get(get_interaction))
        .route("/api/v1/user/favorites", axum::routing::get(list_favorites))
        .with_state(state)
}
