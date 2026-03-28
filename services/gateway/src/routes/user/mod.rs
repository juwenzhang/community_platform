//! 用户 REST Proxy
//!
//! 将 gRPC UserService 方法暴露为 REST + JSON 端点，
//! 自动集成到 Swagger UI 文档中。
//!
//! **重要**：所有 REST proxy handler 必须经过 InterceptorPipeline，
//! 与 gRPC 原生路径保持一致的拦截逻辑（日志、认证、限流、重试等）。

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use tonic::metadata::MetadataMap;
use tracing::{error, info};
use utoipa::ToSchema;

use shared::proto::GetUserRequest;
use shared::proto::user_service_client::UserServiceClient;

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

// ────────────────────────────────────────────
// Swagger DTO（映射 Proto 消息）
// ────────────────────────────────────────────

/// 用户信息
#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserDto {
    /// 用户唯一标识
    pub id: String,
    /// 用户名
    pub username: String,
    /// 邮箱地址
    pub email: String,
    /// 显示名称
    pub display_name: String,
    /// 头像 URL
    pub avatar_url: String,
    /// 个人简介
    pub bio: String,
    /// 创建时间 (ISO 8601)
    pub created_at: Option<String>,
    /// 更新时间 (ISO 8601)
    pub updated_at: Option<String>,
}

/// 获取用户响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetUserDto {
    /// 用户信息
    pub user: Option<UserDto>,
}

/// API 错误响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    /// 错误码
    pub code: u32,
    /// 错误信息
    pub message: String,
}

// ────────────────────────────────────────────
// 共享状态
// ────────────────────────────────────────────

/// REST proxy 共享状态
///
/// 包含 ServiceResolver + InterceptorPipeline，
/// 确保 REST 路径与 gRPC 原生路径走同一套拦截逻辑。
#[derive(Clone)]
pub struct RestProxyState {
    pub resolver: Arc<ServiceResolver>,
    pub pipeline: Arc<InterceptorPipeline>,
}

// ────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────

/// 将 prost Timestamp 转换为 ISO 8601 字符串
fn timestamp_to_string(ts: &prost_types::Timestamp) -> String {
    let secs = ts.seconds;
    let nanos = ts.nanos;
    format!("{secs}.{nanos:09}")
}

/// 将 Proto User 消息转换为 UserDto
fn user_to_dto(user: shared::proto::User) -> UserDto {
    UserDto {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        created_at: user.created_at.as_ref().map(timestamp_to_string),
        updated_at: user.updated_at.as_ref().map(timestamp_to_string),
    }
}

/// 将 axum HeaderMap 转换为 tonic MetadataMap
///
/// tonic MetadataMap 底层就是 http::HeaderMap，可直接转换。
/// 这样 REST proxy 调用拦截器时可以复用与 gRPC 相同的 MetadataMap 接口。
fn headers_to_metadata(headers: &axum::http::HeaderMap) -> MetadataMap {
    MetadataMap::from_headers(headers.clone())
}

/// tonic Status → axum 错误响应
fn status_to_response(status: tonic::Status) -> axum::response::Response {
    let http_status = match status.code() {
        tonic::Code::NotFound => StatusCode::NOT_FOUND,
        tonic::Code::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
        tonic::Code::InvalidArgument => StatusCode::BAD_REQUEST,
        tonic::Code::Unauthenticated => StatusCode::UNAUTHORIZED,
        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
        tonic::Code::DeadlineExceeded => StatusCode::GATEWAY_TIMEOUT,
        tonic::Code::ResourceExhausted => StatusCode::TOO_MANY_REQUESTS,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };
    (
        http_status,
        Json(serde_json::json!({
            "code": http_status.as_u16(),
            "message": status.message()
        })),
    )
        .into_response()
}

// ────────────────────────────────────────────
// REST Proxy Handlers
// ────────────────────────────────────────────

/// 获取用户信息
///
/// 通过用户 ID 获取用户详细信息。Gateway 会将请求转发到 svc-user gRPC 服务。
///
/// **拦截器链**：与 gRPC 原生路径一致，经过完整的 `InterceptorPipeline`
/// （日志 → 认证 → 限流 → 调用 → 重试 → 日志）。
#[utoipa::path(
    get,
    path = "/api/v1/users/{user_id}",
    tag = "用户",
    params(
        ("user_id" = String, Path, description = "用户唯一标识")
    ),
    responses(
        (status = 200, description = "获取成功", body = GetUserDto),
        (status = 404, description = "用户不存在", body = ApiError),
        (status = 503, description = "下游服务不可用", body = ApiError)
    )
)]
pub async fn get_user(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    info!(user_id = %user_id, "REST proxy: GetUser");

    // ── 1. 前置拦截（日志、认证、限流…）──
    let mut ctx = RpcContext::new("user", "get_user");
    let metadata = headers_to_metadata(&headers);

    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        error!(error = %e, "Pre-interceptor rejected request");
        return status_to_response(e);
    }

    // ── 2. 从连接池获取 Channel ──
    let channel = match state.resolver.get_channel("svc-user").await {
        Ok(ch) => ch,
        Err(e) => {
            error!(error = %e, "Failed to resolve svc-user");
            // 后置拦截（记录失败）
            let fail_result: Result<(), tonic::Status> = Err(e.clone());
            let _ = state.pipeline.run_post(&ctx, &fail_result).await;
            return status_to_response(e);
        }
    };

    // ── 3. 调用 gRPC ──
    let mut client = UserServiceClient::new(channel);
    let result = client
        .get_user(GetUserRequest {
            user_id: user_id.clone(),
        })
        .await;

    // ── 4. 后置拦截（日志、重试入队、事件发布…）──
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    if let Err(e) = state.pipeline.run_post(&ctx, &post_result).await {
        error!(error = %e, "Post-interceptor error (non-fatal)");
    }

    // ── 5. 返回 JSON 响应 ──
    match result {
        Ok(response) => {
            let resp = response.into_inner();
            let dto = GetUserDto {
                user: resp.user.map(user_to_dto),
            };
            (
                StatusCode::OK,
                Json(serde_json::to_value(&dto).unwrap_or_default()),
            )
                .into_response()
        }
        Err(status) => {
            error!(
                error = %status,
                grpc_code = ?status.code(),
                "gRPC call to svc-user failed"
            );
            status_to_response(status)
        }
    }
}

// ────────────────────────────────────────────
// Router 构建
// ────────────────────────────────────────────

/// 构建用户 REST 路由
///
/// 同时注入 `ServiceResolver` 和 `InterceptorPipeline`，
/// 确保 REST proxy 与 gRPC 原生路径走同一套拦截逻辑。
pub fn user_rest_router(
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
) -> axum::Router {
    let state = RestProxyState { resolver, pipeline };
    axum::Router::new()
        .route("/api/v1/users/{user_id}", axum::routing::get(get_user))
        .with_state(state)
}
