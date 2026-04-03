//! 社交互动 REST Proxy

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;
use tonic::metadata::MetadataMap;
use utoipa::ToSchema;

use shared::proto::social_service_client::SocialServiceClient;
use shared::proto::{
    FavoriteArticleRequest, GetArticleInteractionRequest, LikeArticleRequest,
    ListFavoritesRequest, UnfavoriteArticleRequest, UnlikeArticleRequest,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

// ──── DTO ────

#[derive(Serialize, ToSchema)]
pub struct InteractionDto {
    pub liked: bool,
    pub favorited: bool,
    pub like_count: i32,
    pub favorite_count: i32,
}

#[derive(Serialize, ToSchema)]
pub struct LikeResponseDto {
    pub like_count: i32,
}

#[derive(Serialize, ToSchema)]
pub struct FavoriteResponseDto {
    pub favorite_count: i32,
}

#[derive(Serialize, ToSchema)]
pub struct ApiError {
    pub error: String,
}

// ──── Router ────

#[derive(Clone)]
pub struct SocialRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

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

// ──── Helpers ────

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<SocialServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel("svc-content")
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(SocialServiceClient::new(channel))
}

fn extract_bearer(headers: &axum::http::HeaderMap) -> Option<String> {
    headers.get("authorization").and_then(|v| v.to_str().ok()).map(|s| s.to_string())
}

fn build_metadata(auth_header: Option<&str>) -> MetadataMap {
    let mut metadata = MetadataMap::new();
    if let Some(auth) = auth_header {
        if let Ok(val) = auth.parse() {
            metadata.insert("authorization", val);
        }
    }
    metadata
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "like_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(LikeArticleRequest { article_id: id });
            if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            match client.like_article(req).await {
                Ok(resp) => Json(serde_json::json!({"like_count": resp.into_inner().like_count})).into_response(),
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "unlike_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(UnlikeArticleRequest { article_id: id });
            if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            match client.unlike_article(req).await {
                Ok(resp) => Json(serde_json::json!({"like_count": resp.into_inner().like_count})).into_response(),
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "favorite_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(FavoriteArticleRequest { article_id: id });
            if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            match client.favorite_article(req).await {
                Ok(resp) => Json(serde_json::json!({"favorite_count": resp.into_inner().favorite_count})).into_response(),
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "unfavorite_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(UnfavoriteArticleRequest { article_id: id });
            if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            match client.unfavorite_article(req).await {
                Ok(resp) => Json(serde_json::json!({"favorite_count": resp.into_inner().favorite_count})).into_response(),
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "get_interaction");
    let _ = state.pipeline.run_pre(&mut ctx, &metadata).await; // 可选认证

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(GetArticleInteractionRequest { article_id: id });
            if let Some(user_id) = ctx.attrs.get("user_id") {
                if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            }
            match client.get_article_interaction(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    Json(serde_json::json!({
                        "liked": inner.liked,
                        "favorited": inner.favorited,
                        "like_count": inner.like_count,
                        "favorite_count": inner.favorite_count,
                    })).into_response()
                }
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
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
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("social", "list_favorites");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }
    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(ListFavoritesRequest {
                pagination: Some(shared::proto::PaginationRequest {
                    page_size: 50,
                    page_token: String::new(),
                }),
            });
            if let Ok(val) = user_id.parse() { req.metadata_mut().insert("x-user-id", val); }
            match client.list_favorites(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let articles: Vec<_> = inner.articles.into_iter().map(|a| {
                        serde_json::json!({
                            "id": a.id,
                            "title": a.title,
                            "slug": a.slug,
                            "summary": a.summary,
                            "author_id": a.author_id,
                            "tags": a.tags,
                            "view_count": a.view_count,
                            "like_count": a.like_count,
                            "status": a.status,
                            "categories": a.categories,
                            "created_at": a.created_at.map(|t| t.seconds.to_string()),
                            "published_at": a.published_at.map(|t| t.seconds.to_string()),
                        })
                    }).collect();
                    Json(serde_json::json!({"articles": articles, "total_count": inner.pagination.map(|p| p.total_count).unwrap_or(0)})).into_response()
                }
                Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response(),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}
