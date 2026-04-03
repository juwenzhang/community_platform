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
use tracing::{error, info};

use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    GetCurrentUserRequest, GetUserByUsernameRequest, GetUserRequest, ListUsersRequest,
    LoginRequest, RegisterRequest, UpdateProfileRequest,
};

use crate::dto::common::status_to_response;
use crate::dto::user::{
    AuthDto, GetUserDto, ListUsersDto, ListUsersQuery, RegisterDto, LoginDto,
    UpdateProfileDto, user_to_dto,
};
use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

use super::helpers;

// ────────────────────────────────────────────
// Re-export DTO types for Swagger schema registration
// ────────────────────────────────────────────

pub use crate::dto::common::ApiError;
pub use crate::dto::user::{
    UserDto, SocialLinkDto, GetUserDto as GetUserDtoSchema,
    AuthDto as AuthDtoSchema, RegisterDto as RegisterDtoSchema,
    LoginDto as LoginDtoSchema, UpdateProfileDto as UpdateProfileDtoSchema,
    ListUsersDto as ListUsersDtoSchema, ListUsersQuery as ListUsersQuerySchema,
};

// ────────────────────────────────────────────
// 共享状态
// ────────────────────────────────────────────

#[derive(Clone)]
pub struct RestProxyState {
    pub resolver: Arc<ServiceResolver>,
    pub pipeline: Arc<InterceptorPipeline>,
}

/// 获取 gRPC client
async fn get_client(
    state: &RestProxyState,
) -> Result<UserServiceClient<tonic::transport::Channel>, axum::response::Response> {
    state
        .resolver
        .get_channel(shared::constants::SVC_USER)
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut req = tonic::Request::new(GetCurrentUserRequest {});
    if let Some(uid) = ctx.attrs.get("user_id") {
        helpers::inject_user_id_metadata(&mut req, uid);
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
    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }
    let mut client = match get_client(&state).await {
        Ok(c) => c,
        Err(r) => return r,
    };
    let mut req = tonic::Request::new(UpdateProfileRequest {
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        bio: body.bio,
        company: body.company,
        location: body.location,
        website: body.website,
        social_links: body.social_links.into_iter().map(|l| shared::proto::SocialLink { platform: l.platform, url: l.url }).collect(),
    });
    if let Some(uid) = ctx.attrs.get("user_id") {
        helpers::inject_user_id_metadata(&mut req, uid);
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
        .route("/api/v1/users", axum::routing::get(list_users))
        .route("/api/v1/users/{user_id}", axum::routing::get(get_user))
        .route("/api/v1/users/by-username/{username}", axum::routing::get(get_user_by_username))
        .route("/api/v1/auth/register", axum::routing::post(register))
        .route("/api/v1/auth/login", axum::routing::post(login))
        .route("/api/v1/auth/me", axum::routing::get(get_current_user))
        .route("/api/v1/auth/profile", axum::routing::put(update_profile))
        .with_state(state)
}
