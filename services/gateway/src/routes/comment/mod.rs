//! 评论 REST Proxy

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use tonic::metadata::MetadataMap;
use tracing::{error, info};
use utoipa::ToSchema;

use shared::proto::comment_service_client::CommentServiceClient;
use shared::proto::{CreateCommentRequest, DeleteCommentRequest, ListCommentsRequest};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

// ──── DTO ────

#[derive(Serialize, ToSchema)]
#[schema(no_recursion)]
pub struct CommentDto {
    pub id: String,
    pub article_id: String,
    pub author_id: String,
    pub content: String,
    pub parent_id: String,
    pub reply_to_id: String,
    pub mentions: Vec<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub author: Option<CommentAuthorDto>,
    pub reply_to_author: Option<CommentAuthorDto>,
    pub replies: Vec<CommentDto>,
}

#[derive(Serialize, ToSchema)]
pub struct CommentAuthorDto {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: String,
}

#[derive(Serialize, ToSchema)]
pub struct ListCommentsDto {
    pub comments: Vec<CommentDto>,
    pub total_count: i32,
}

#[derive(Deserialize, ToSchema)]
pub struct CreateCommentBody {
    pub content: String,
    pub parent_id: Option<String>,
    pub reply_to_id: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct ListCommentsQuery {
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ApiError {
    pub error: String,
}

// ──── Router ────

#[derive(Clone)]
pub struct CommentRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

pub fn comment_rest_router(
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
) -> axum::Router {
    let state = CommentRouterState { resolver, pipeline };
    axum::Router::new()
        .route(
            "/api/v1/articles/{id}/comments",
            axum::routing::get(list_comments).post(create_comment),
        )
        .route(
            "/api/v1/comments/{id}",
            axum::routing::delete(delete_comment),
        )
        .with_state(state)
}

// ──── Helpers ────

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<CommentServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel("svc-content")
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(CommentServiceClient::new(channel))
}

fn extract_bearer(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
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

fn proto_comment_to_dto(c: shared::proto::Comment) -> CommentDto {
    CommentDto {
        id: c.id,
        article_id: c.article_id,
        author_id: c.author_id,
        content: c.content,
        parent_id: c.parent_id,
        reply_to_id: c.reply_to_id,
        mentions: c.mentions,
        created_at: c.created_at.map(|t| format!("{}", t.seconds)),
        updated_at: c.updated_at.map(|t| format!("{}", t.seconds)),
        author: c.author.map(user_to_author_dto),
        reply_to_author: c.reply_to_author.map(user_to_author_dto),
        replies: c.replies.into_iter().map(proto_comment_to_dto).collect(),
    }
}

fn user_to_author_dto(u: shared::proto::User) -> CommentAuthorDto {
    CommentAuthorDto {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
    }
}

// ──── Handlers ────

/// 获取文章评论列表
#[utoipa::path(
    get,
    path = "/api/v1/articles/{id}/comments",
    params(
        ("id" = String, Path, description = "文章 ID"),
        ("page_size" = Option<i32>, Query, description = "每页大小"),
    ),
    responses(
        (status = 200, description = "评论列表", body = ListCommentsDto),
    ),
    tag = "评论"
)]
pub async fn list_comments(
    State(state): State<CommentRouterState>,
    Path(id): Path<String>,
    Query(params): Query<ListCommentsQuery>,
) -> impl IntoResponse {
    info!(article_id = %id, "REST: ListComments");

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let req = ListCommentsRequest {
                article_id: id,
                pagination: Some(shared::proto::PaginationRequest {
                    page_size: params.page_size.unwrap_or(50),
                    page_token: params.page_token.unwrap_or_default(),
                }),
            };
            match client.list_comments(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let pagination = inner.pagination.unwrap_or_default();
                    let comments: Vec<_> = inner.comments.into_iter().map(proto_comment_to_dto).collect();
                    Json(serde_json::json!({
                        "comments": comments,
                        "total_count": pagination.total_count,
                    })).into_response()
                }
                Err(e) => {
                    error!(error = %e, "ListComments failed");
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 创建评论
#[utoipa::path(
    post,
    path = "/api/v1/articles/{id}/comments",
    params(("id" = String, Path, description = "文章 ID")),
    request_body = CreateCommentBody,
    responses(
        (status = 201, description = "评论创建成功"),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "评论"
)]
pub async fn create_comment(
    State(state): State<CommentRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<CreateCommentBody>,
) -> impl IntoResponse {
    info!(article_id = %id, "REST: CreateComment");

    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("comment", "create_comment");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(CreateCommentRequest {
                article_id: id,
                content: body.content,
                parent_id: body.parent_id.unwrap_or_default(),
                reply_to_id: body.reply_to_id.unwrap_or_default(),
            });
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }
            match client.create_comment(req).await {
                Ok(resp) => {
                    let comment = resp.into_inner().comment.map(proto_comment_to_dto);
                    (StatusCode::CREATED, Json(serde_json::json!({"comment": comment}))).into_response()
                }
                Err(e) => {
                    error!(error = %e, "CreateComment failed");
                    (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 删除评论
#[utoipa::path(
    delete,
    path = "/api/v1/comments/{id}",
    params(("id" = String, Path, description = "评论 ID")),
    responses(
        (status = 204, description = "删除成功"),
        (status = 401, description = "未认证", body = ApiError),
        (status = 403, description = "无权限", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "评论"
)]
pub async fn delete_comment(
    State(state): State<CommentRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    info!(comment_id = %id, "REST: DeleteComment");

    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("comment", "delete_comment");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(DeleteCommentRequest { comment_id: id });
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }
            match client.delete_comment(req).await {
                Ok(_) => StatusCode::NO_CONTENT.into_response(),
                Err(e) => {
                    let code = match e.code() {
                        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
                        tonic::Code::NotFound => StatusCode::NOT_FOUND,
                        _ => StatusCode::BAD_REQUEST,
                    };
                    (code, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}
