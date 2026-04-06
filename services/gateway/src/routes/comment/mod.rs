//! 评论 REST Proxy

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use tracing::{error, info};

use shared::proto::comment_service_client::CommentServiceClient;
use shared::proto::{CreateCommentRequest, DeleteCommentRequest, ListCommentsRequest};

use crate::dto::common::status_to_response;
use crate::dto::comment::{
    CreateCommentBody, ListCommentsDto, ListCommentsQuery, proto_comment_to_dto,
};
use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

use super::helpers;

// Re-export for Swagger
pub use crate::dto::comment::{
    CommentDto, CommentAuthorDto, ListCommentsDto as ListCommentsDtoSchema,
    CreateCommentBody as CreateCommentBodySchema, ListCommentsQuery as ListCommentsQuerySchema,
};
pub use crate::dto::common::ApiError;

// ──── 共享状态 + Helpers ────

#[derive(Clone)]
pub struct CommentRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<CommentServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel(shared::constants::SVC_CONTENT)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(CommentServiceClient::new(channel))
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
                    page_size: params.page_size.unwrap_or(shared::constants::DEFAULT_PAGE_SIZE),
                    page_token: params.page_token.unwrap_or_default(),
                }),
                sort: params.sort.unwrap_or(0),
                cursor: params.cursor.unwrap_or_default(),
            };
            match client.list_comments(req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let pagination = inner.pagination.unwrap_or_default();
                    let dto = ListCommentsDto {
                        comments: inner.comments.into_iter().map(proto_comment_to_dto).collect(),
                        total_count: pagination.total_count,
                    };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => {
                    error!(error = %e, "ListComments failed");
                    status_to_response(e)
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("comment", "create_comment");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(CreateCommentRequest {
                article_id: id,
                content: body.content,
                parent_id: body.parent_id.unwrap_or_default(),
                reply_to_id: body.reply_to_id.unwrap_or_default(),
                media_attachments: body
                    .media_attachments
                    .unwrap_or_default()
                    .into_iter()
                    .map(|ma| shared::proto::MediaAttachment {
                        media_type: ma.media_type,
                        url: ma.url,
                        preview_url: ma.preview_url,
                        width: ma.width,
                        height: ma.height,
                        giphy_id: ma.giphy_id,
                        alt_text: ma.alt_text,
                    })
                    .collect(),
            });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.create_comment(req).await {
                Ok(resp) => {
                    let comment = resp.into_inner().comment.map(proto_comment_to_dto);
                    (StatusCode::CREATED, Json(serde_json::json!({"comment": comment}))).into_response()
                }
                Err(e) => {
                    error!(error = %e, "CreateComment failed");
                    status_to_response(e)
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("comment", "delete_comment");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(DeleteCommentRequest { comment_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);
            match client.delete_comment(req).await {
                Ok(_) => StatusCode::NO_CONTENT.into_response(),
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

// ──── Router 构建 ────

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
