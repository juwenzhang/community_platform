//! UserService gRPC 实现
//!
//! 负责请求解析 + 调用 handler + 构造响应。
//! 业务逻辑在 handlers/user/ 中。
//! 使用 shared::extract 替代本地 extract_user_id / db_unavailable。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::user_service_server::UserService;
use shared::proto::{
    AuthResponse, GetCurrentUserRequest, GetUserByUsernameRequest, GetUserRequest,
    GetUserResponse, ListUsersRequest, ListUsersResponse, LoginRequest, RegisterRequest,
    UpdateProfileRequest, UpdateProfileResponse,
};

use crate::handlers::user;

/// UserService gRPC 实现
#[derive(Clone)]
pub struct UserServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
}

impl UserServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>) -> Self {
        Self { db }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db
            .as_deref()
            .ok_or_else(shared::extract::db_unavailable)
    }
}

#[tonic::async_trait]
impl UserService for UserServiceImpl {
    /// 按 ID 获取用户（公开）
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(user_id = %req.user_id, "GetUser");

        let proto_user = user::get_user_by_id(self.db()?, &req.user_id).await?;
        Ok(Response::new(GetUserResponse {
            user: Some(proto_user),
        }))
    }

    /// 按用户名获取用户（公开）
    async fn get_user_by_username(
        &self,
        request: Request<GetUserByUsernameRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(username = %req.username, "GetUserByUsername");

        let proto_user = user::get_user_by_username(self.db()?, &req.username).await?;
        Ok(Response::new(GetUserResponse {
            user: Some(proto_user),
        }))
    }

    /// 用户列表（公开，支持搜索 + 分页）
    async fn list_users(
        &self,
        request: Request<ListUsersRequest>,
    ) -> Result<Response<ListUsersResponse>, Status> {
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(query = %req.query, "ListUsers");

        let (users, next_page_token, total_count) = user::list_users(
            self.db()?,
            &req.query,
            pagination.page_size,
            &pagination.page_token,
        )
        .await?;

        Ok(Response::new(ListUsersResponse {
            users,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count,
            }),
        }))
    }

    /// 获取当前登录用户（需认证）
    async fn get_current_user(
        &self,
        request: Request<GetCurrentUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        info!(user_id = %user_id, "GetCurrentUser");

        let proto_user = user::get_user_by_id(self.db()?, &user_id).await?;
        Ok(Response::new(GetUserResponse {
            user: Some(proto_user),
        }))
    }

    /// 用户注册（公开）
    async fn register(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();
        info!(username = %req.username, "Register");

        let (proto_user, token) =
            user::auth::register(self.db()?, &req.username, &req.email, &req.password).await?;

        Ok(Response::new(AuthResponse {
            token,
            user: Some(proto_user),
        }))
    }

    /// 用户登录（公开）
    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();
        info!(username = %req.username, "Login");

        let (proto_user, token) =
            user::auth::login(self.db()?, &req.username, &req.password).await?;

        Ok(Response::new(AuthResponse {
            token,
            user: Some(proto_user),
        }))
    }

    /// 更新用户资料（需认证）
    async fn update_profile(
        &self,
        request: Request<UpdateProfileRequest>,
    ) -> Result<Response<UpdateProfileResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(user_id = %user_id, "UpdateProfile");

        let proto_user = user::profile::update_profile(
            self.db()?,
            &user_id,
            &req.display_name,
            &req.avatar_url,
            &req.bio,
            &req.company,
            &req.location,
            &req.website,
            &req.social_links,
        )
        .await?;

        Ok(Response::new(UpdateProfileResponse {
            user: Some(proto_user),
        }))
    }
}
