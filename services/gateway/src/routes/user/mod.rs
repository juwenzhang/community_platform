//! 用户 REST Proxy
//!
//! 将 gRPC UserService 方法暴露为 REST + JSON 端点，
//! 自动集成到 Swagger UI 文档中。
//!
//! **重要**：所有 REST proxy handler 必须经过 InterceptorPipeline，
//! 与 gRPC 原生路径保持一致的拦截逻辑（日志、认证、限流、重试等）。

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use tonic::metadata::MetadataMap;
use tracing::{error, info};
use utoipa::ToSchema;

use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    GetCurrentUserRequest, GetUserByUsernameRequest, GetUserRequest, ListUsersRequest,
    LoginRequest, RegisterRequest, UpdateProfileRequest,
};

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
    /// 创建时间
    pub created_at: Option<String>,
    /// 更新时间
    pub updated_at: Option<String>,
}

/// 获取用户响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetUserDto {
    pub user: Option<UserDto>,
}

/// 认证响应（登录/注册）
#[derive(Serialize, Deserialize, ToSchema)]
pub struct AuthDto {
    /// JWT token
    pub token: String,
    /// 用户信息
    pub user: Option<UserDto>,
}

/// 注册请求
#[derive(Serialize, Deserialize, ToSchema)]
pub struct RegisterDto {
    /// 用户名（3-20字符，字母/数字/下划线/连字符）
    pub username: String,
    /// 邮箱地址
    pub email: String,
    /// 密码（8-72字符，至少包含字母和数字）
    pub password: String,
}

/// 登录请求
#[derive(Serialize, Deserialize, ToSchema)]
pub struct LoginDto {
    /// 用户名
    pub username: String,
    /// 密码
    pub password: String,
}

/// 更新资料请求
#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateProfileDto {
    /// 显示名称（空字符串表示不更新）
    #[serde(default)]
    pub display_name: String,
    /// 头像 URL
    #[serde(default)]
    pub avatar_url: String,
    /// 个人简介
    #[serde(default)]
    pub bio: String,
}

/// 用户列表响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ListUsersDto {
    pub users: Vec<UserDto>,
    pub next_page_token: String,
    pub total_count: i32,
}

/// 用户列表查询参数
#[derive(Deserialize, ToSchema)]
pub struct ListUsersQuery {
    /// 搜索关键词
    #[serde(default)]
    pub query: String,
    /// 每页大小（默认 20，最大 100）
    #[serde(default = "default_page_size")]
    pub page_size: i32,
    /// 分页游标
    #[serde(default)]
    pub page_token: String,
}

fn default_page_size() -> i32 {
    20
}

/// API 错误响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    pub code: u32,
    pub message: String,
}

// ────────────────────────────────────────────
// 共享状态 + 工具函数
// ────────────────────────────────────────────

#[derive(Clone)]
pub struct RestProxyState {
    pub resolver: Arc<ServiceResolver>,
    pub pipeline: Arc<InterceptorPipeline>,
}

fn timestamp_to_string(ts: &prost_types::Timestamp) -> String {
    let secs = ts.seconds;
    let nanos = ts.nanos;
    format!("{secs}.{nanos:09}")
}

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

fn headers_to_metadata(headers: &axum::http::HeaderMap) -> MetadataMap {
    MetadataMap::from_headers(headers.clone())
}

fn status_to_response(status: tonic::Status) -> axum::response::Response {
    let http_status = match status.code() {
        tonic::Code::NotFound => StatusCode::NOT_FOUND,
        tonic::Code::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
        tonic::Code::InvalidArgument => StatusCode::BAD_REQUEST,
        tonic::Code::Unauthenticated => StatusCode::UNAUTHORIZED,
        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
        tonic::Code::AlreadyExists => StatusCode::CONFLICT,
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

/// 获取 gRPC client
async fn get_client(
    state: &RestProxyState,
) -> Result<UserServiceClient<tonic::transport::Channel>, axum::response::Response> {
    state
        .resolver
        .get_channel("svc-user")
        .await
        .map(UserServiceClient::new)
        .map_err(|e| {
            error!(error = %e, "Failed to resolve svc-user");
            status_to_response(e)
        })
}

// ────────────────────────────────────────────
// REST Proxy Handlers
// ────────────────────────────────────────────

/// 获取用户信息（按 ID）
#[utoipa::path(
    get,
    path = "/api/v1/users/{user_id}",
    tag = "用户",
    params(("user_id" = String, Path, description = "用户 ID")),
    responses(
        (status = 200, description = "获取成功", body = GetUserDto),
        (status = 404, description = "用户不存在", body = ApiError),
    )
)]
pub async fn get_user(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    info!(user_id = %user_id, "REST: GetUser");
    let mut ctx = RpcContext::new("user", "get_user");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let result = client.get_user(GetUserRequest { user_id }).await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(&GetUserDto { user: r.into_inner().user.map(user_to_dto) }).unwrap_or_default())).into_response(),
        Err(s) => status_to_response(s),
    }
}

/// 获取用户信息（按用户名）
#[utoipa::path(
    get,
    path = "/api/v1/users/by-username/{username}",
    tag = "用户",
    params(("username" = String, Path, description = "用户名")),
    responses(
        (status = 200, description = "获取成功", body = GetUserDto),
        (status = 404, description = "用户不存在", body = ApiError),
    )
)]
pub async fn get_user_by_username(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Path(username): Path<String>,
) -> impl IntoResponse {
    info!(username = %username, "REST: GetUserByUsername");
    let mut ctx = RpcContext::new("user", "get_user_by_username");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let result = client.get_user_by_username(GetUserByUsernameRequest { username }).await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(&GetUserDto { user: r.into_inner().user.map(user_to_dto) }).unwrap_or_default())).into_response(),
        Err(s) => status_to_response(s),
    }
}

/// 用户列表（搜索 + 分页）
#[utoipa::path(
    get,
    path = "/api/v1/users",
    tag = "用户",
    params(
        ("query" = Option<String>, Query, description = "搜索关键词"),
        ("page_size" = Option<i32>, Query, description = "每页大小（默认 20）"),
        ("page_token" = Option<String>, Query, description = "分页游标"),
    ),
    responses(
        (status = 200, description = "用户列表", body = ListUsersDto),
    )
)]
pub async fn list_users(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<ListUsersQuery>,
) -> impl IntoResponse {
    info!(query = %params.query, "REST: ListUsers");
    let mut ctx = RpcContext::new("user", "list_users");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let result = client
        .list_users(ListUsersRequest {
            query: params.query,
            pagination: Some(shared::proto::PaginationRequest {
                page_size: params.page_size,
                page_token: params.page_token,
            }),
        })
        .await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => {
            let inner = r.into_inner();
            let pagination = inner.pagination.unwrap_or_default();
            let dto = ListUsersDto {
                users: inner.users.into_iter().map(user_to_dto).collect(),
                next_page_token: pagination.next_page_token,
                total_count: pagination.total_count,
            };
            (StatusCode::OK, Json(serde_json::to_value(&dto).unwrap_or_default())).into_response()
        }
        Err(s) => status_to_response(s),
    }
}

/// 用户注册
#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "认证",
    request_body = RegisterDto,
    responses(
        (status = 200, description = "注册成功", body = AuthDto),
        (status = 400, description = "参数错误", body = ApiError),
        (status = 409, description = "用户名或邮箱已存在", body = ApiError),
    )
)]
pub async fn register(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<RegisterDto>,
) -> impl IntoResponse {
    info!(username = %body.username, "REST: Register");
    let mut ctx = RpcContext::new("user", "register");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let result = client
        .register(RegisterRequest {
            username: body.username,
            email: body.email,
            password: body.password,
        })
        .await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => {
            let inner = r.into_inner();
            let dto = AuthDto {
                token: inner.token,
                user: inner.user.map(user_to_dto),
            };
            (StatusCode::OK, Json(serde_json::to_value(&dto).unwrap_or_default())).into_response()
        }
        Err(s) => status_to_response(s),
    }
}

/// 用户登录
#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "认证",
    request_body = LoginDto,
    responses(
        (status = 200, description = "登录成功", body = AuthDto),
        (status = 401, description = "用户名或密码错误", body = ApiError),
    )
)]
pub async fn login(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<LoginDto>,
) -> impl IntoResponse {
    info!(username = %body.username, "REST: Login");
    let mut ctx = RpcContext::new("user", "login");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let result = client
        .login(LoginRequest {
            username: body.username,
            password: body.password,
        })
        .await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => {
            let inner = r.into_inner();
            let dto = AuthDto {
                token: inner.token,
                user: inner.user.map(user_to_dto),
            };
            (StatusCode::OK, Json(serde_json::to_value(&dto).unwrap_or_default())).into_response()
        }
        Err(s) => status_to_response(s),
    }
}

/// 获取当前登录用户（需 Authorization header）
#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    tag = "认证",
    security(("bearer" = [])),
    responses(
        (status = 200, description = "当前用户信息", body = GetUserDto),
        (status = 401, description = "未认证", body = ApiError),
    )
)]
pub async fn get_current_user(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    info!("REST: GetCurrentUser");
    let mut ctx = RpcContext::new("user", "get_current_user");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    // 透传 x-user-id
    let mut req = tonic::Request::new(GetCurrentUserRequest {});
    if let Some(uid) = ctx.attrs.get("user_id") {
        if let Ok(val) = uid.parse() {
            req.metadata_mut().insert("x-user-id", val);
        }
    }
    let result = client.get_current_user(req).await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(&GetUserDto { user: r.into_inner().user.map(user_to_dto) }).unwrap_or_default())).into_response(),
        Err(s) => status_to_response(s),
    }
}

/// 更新用户资料（需 Authorization header）
#[utoipa::path(
    put,
    path = "/api/v1/auth/profile",
    tag = "认证",
    security(("bearer" = [])),
    request_body = UpdateProfileDto,
    responses(
        (status = 200, description = "更新成功", body = GetUserDto),
        (status = 401, description = "未认证", body = ApiError),
    )
)]
pub async fn update_profile(
    State(state): State<RestProxyState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<UpdateProfileDto>,
) -> impl IntoResponse {
    info!("REST: UpdateProfile");
    let mut ctx = RpcContext::new("user", "update_profile");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &headers_to_metadata(&headers)).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    // 透传 x-user-id
    let mut req = tonic::Request::new(UpdateProfileRequest {
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        bio: body.bio,
    });
    if let Some(uid) = ctx.attrs.get("user_id") {
        if let Ok(val) = uid.parse() {
            req.metadata_mut().insert("x-user-id", val);
        }
    }
    let result = client.update_profile(req).await;
    let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
    let _ = state.pipeline.run_post(&ctx, &post_result).await;
    match result {
        Ok(r) => (StatusCode::OK, Json(serde_json::to_value(&GetUserDto { user: r.into_inner().user.map(user_to_dto) }).unwrap_or_default())).into_response(),
        Err(s) => status_to_response(s),
    }
}

// ────────────────────────────────────────────
// Router 构建
// ────────────────────────────────────────────

pub fn user_rest_router(
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
) -> axum::Router {
    let state = RestProxyState { resolver, pipeline };
    axum::Router::new()
        // 用户查询（公开）
        .route("/api/v1/users", axum::routing::get(list_users))
        .route("/api/v1/users/{user_id}", axum::routing::get(get_user))
        .route("/api/v1/users/by-username/{username}", axum::routing::get(get_user_by_username))
        // 认证（公开）
        .route("/api/v1/auth/register", axum::routing::post(register))
        .route("/api/v1/auth/login", axum::routing::post(login))
        // 认证用户操作（需 token）
        .route("/api/v1/auth/me", axum::routing::get(get_current_user))
        .route("/api/v1/auth/profile", axum::routing::put(update_profile))
        .with_state(state)
}
