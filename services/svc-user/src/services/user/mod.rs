//! UserService gRPC 实现
//!
//! 负责请求解析 + 调用 handler + 构造响应。
//! 业务逻辑在 handlers/user/ 中。
//! Redis Cache-Aside: 用户信息 TTL 10min。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;
use prost::Message;
use base64::engine::general_purpose;
use base64::Engine;

use shared::proto::user_service_server::UserService;
use shared::proto::{
    AuthResponse, GetCurrentUserRequest, GetUserByUsernameRequest, GetUserRequest,
    GetUserResponse, ListUsersRequest, ListUsersResponse, LoginRequest, RegisterRequest,
    UpdateProfileRequest, UpdateProfileResponse, User,
};
use shared::redis::RedisPool;
use shared::messaging::NatsClient;

use crate::handlers::user;

/// 用户信息缓存 TTL（秒）
const USER_CACHE_TTL: u64 = 600; // 10 minutes

/// 用户缓存 key（按 ID）
fn user_cache_key(user_id: &str) -> String {
    format!("{}{user_id}", shared::constants::REDIS_USER_KEY_PREFIX)
}

/// 用户缓存 key（按 username）
fn user_username_cache_key(username: &str) -> String {
    format!("{}{username}", shared::constants::REDIS_USER_USERNAME_KEY_PREFIX)
}

/// UserService gRPC 实现
#[derive(Clone)]
pub struct UserServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    redis: Option<Arc<RedisPool>>,
    nats: Option<Arc<NatsClient>>,
}

impl UserServiceImpl {
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

    /// Cache-Aside GET: 按 ID 获取用户
    async fn get_user_cached(&self, user_id: &str) -> Result<User, Status> {
        if let Some(redis) = &self.redis {
            let key = user_cache_key(user_id);
            if let Some(cached) = redis.get(&key).await {
                if let Ok(bytes) = general_purpose::STANDARD.decode(&cached) {
                    if let Ok(u) = User::decode(bytes.as_slice()) {
                        return Ok(u);
                    }
                }
            }
        }

        let proto_user = user::get_user_by_id(self.db()?, user_id).await?;

        if let Some(redis) = &self.redis {
            let key = user_cache_key(user_id);
            let encoded = general_purpose::STANDARD.encode(proto_user.encode_to_vec());
            let redis = redis.clone();
            tokio::spawn(async move {
                redis.set(&key, &encoded, USER_CACHE_TTL).await;
            });
        }

        Ok(proto_user)
    }

    /// Cache-Aside GET: 按 username 获取用户
    async fn get_user_by_username_cached(&self, username: &str) -> Result<User, Status> {
        if let Some(redis) = &self.redis {
            let key = user_username_cache_key(username);
            if let Some(cached) = redis.get(&key).await {
                if let Ok(bytes) = general_purpose::STANDARD.decode(&cached) {
                    if let Ok(u) = User::decode(bytes.as_slice()) {
                        return Ok(u);
                    }
                }
            }
        }

        let proto_user = user::get_user_by_username(self.db()?, username).await?;

        if let Some(redis) = &self.redis {
            // 同时缓存 by-id 和 by-username
            let id_key = user_cache_key(&proto_user.id);
            let uname_key = user_username_cache_key(username);
            let encoded = general_purpose::STANDARD.encode(proto_user.encode_to_vec());
            let redis = redis.clone();
            let encoded2 = encoded.clone();
            tokio::spawn(async move {
                redis.set(&id_key, &encoded, USER_CACHE_TTL).await;
                redis.set(&uname_key, &encoded2, USER_CACHE_TTL).await;
            });
        }

        Ok(proto_user)
    }

    /// 写操作后失效用户缓存（id + username 两个 key）
    async fn invalidate_user_cache(&self, user_id: &str, username: &str) {
        if let Some(redis) = &self.redis {
            let id_key = user_cache_key(user_id);
            let uname_key = user_username_cache_key(username);
            redis.del(&[&id_key, &uname_key]).await;
        }
    }
}

#[tonic::async_trait]
impl UserService for UserServiceImpl {
    /// 按 ID 获取用户（公开，Cache-Aside）
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(user_id = %req.user_id, "GetUser");

        let proto_user = self.get_user_cached(&req.user_id).await?;
        Ok(Response::new(GetUserResponse {
            user: Some(proto_user),
        }))
    }

    /// 按用户名获取用户（公开，Cache-Aside）
    async fn get_user_by_username(
        &self,
        request: Request<GetUserByUsernameRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(username = %req.username, "GetUserByUsername");

        let proto_user = self.get_user_by_username_cached(&req.username).await?;
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

    /// 获取当前登录用户（需认证，Cache-Aside）
    async fn get_current_user(
        &self,
        request: Request<GetCurrentUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let user_id = shared::extract::extract_user_id(&request)?;
        info!(user_id = %user_id, "GetCurrentUser");

        let proto_user = self.get_user_cached(&user_id).await?;
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

    /// 更新用户资料（需认证）— 写操作后失效缓存
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

        // 写操作后主动失效缓存（按 id 和 username）
        self.invalidate_user_cache(&user_id, &proto_user.username).await;

        // 发布用户更新事件（搜索索引同步）
        if let Some(nats) = &self.nats {
            let payload = proto_user.encode_to_vec();
            let nats = nats.clone();
            tokio::spawn(async move {
                if let Err(e) = nats.publish_bytes(shared::constants::NATS_EVENT_USER_UPDATED, payload).await {
                    tracing::warn!(error = %e, "Failed to publish user.updated event");
                }
            });
        }

        Ok(Response::new(UpdateProfileResponse {
            user: Some(proto_user),
        }))
    }
}
