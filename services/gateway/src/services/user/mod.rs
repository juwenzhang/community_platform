//! Gateway BFF 层 — UserService 转发
//!
//! 实现 UserService trait，所有 RPC 调用经过 InterceptorPipeline 拦截。
//! 需认证的方法会从 ctx.attrs["user_id"] 取出认证用户 ID，
//! 设置到下游 request 的 x-user-id metadata 中，供 svc-user 使用。

use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::user_service_client::UserServiceClient;
use shared::proto::user_service_server::UserService;
use shared::proto::{
    AuthResponse, GetCurrentUserRequest, GetUserByUsernameRequest, GetUserRequest,
    GetUserResponse, ListUsersRequest, ListUsersResponse, LoginRequest, RegisterRequest,
    UpdateProfileRequest, UpdateProfileResponse,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

#[derive(Clone)]
pub struct GatewayUserService {
    pub(crate) resolver: Arc<ServiceResolver>,
    pub(crate) pipeline: Arc<InterceptorPipeline>,
}

impl GatewayUserService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }

    /// 获取 svc-user gRPC client
    async fn client(&self) -> Result<UserServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel("svc-user").await?;
        Ok(UserServiceClient::new(channel))
    }

    /// 为需认证的方法：从 ctx.attrs 提取 user_id，设置到下游 request metadata
    fn inject_user_id<T>(ctx: &RpcContext, inner: T) -> Result<Request<T>, Status> {
        let user_id = ctx
            .attrs
            .get("user_id")
            .ok_or_else(|| Status::unauthenticated("Missing user_id in auth context"))?;

        let mut req = Request::new(inner);
        req.metadata_mut().insert(
            "x-user-id",
            user_id
                .parse()
                .map_err(|_| Status::internal("Invalid user_id format"))?,
        );
        Ok(req)
    }
}

/// 宏：减少转发样板代码
/// 公开方法（无需 user_id 透传）
macro_rules! forward_public {
    ($self:expr, $request:expr, $ctx_service:expr, $ctx_method:expr, $rpc_call:ident) => {{
        let mut ctx = RpcContext::new($ctx_service, $ctx_method);
        $self.pipeline.run_pre(&mut ctx, $request.metadata()).await?;

        let inner = $request.into_inner();
        let result = $self.client().await?.$rpc_call(inner).await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        $self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }};
}

/// 宏：需认证方法（透传 x-user-id）
macro_rules! forward_authed {
    ($self:expr, $request:expr, $ctx_service:expr, $ctx_method:expr, $rpc_call:ident) => {{
        let mut ctx = RpcContext::new($ctx_service, $ctx_method);
        $self.pipeline.run_pre(&mut ctx, $request.metadata()).await?;

        let inner = $request.into_inner();
        let downstream_req = Self::inject_user_id(&ctx, inner)?;
        let result = $self.client().await?.$rpc_call(downstream_req).await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        $self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }};
}

#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        info!("Gateway: GetUser");
        forward_public!(self, request, "user", "get_user", get_user)
    }

    async fn get_user_by_username(
        &self,
        request: Request<GetUserByUsernameRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        info!("Gateway: GetUserByUsername");
        forward_public!(self, request, "user", "get_user_by_username", get_user_by_username)
    }

    async fn list_users(
        &self,
        request: Request<ListUsersRequest>,
    ) -> Result<Response<ListUsersResponse>, Status> {
        info!("Gateway: ListUsers");
        forward_public!(self, request, "user", "list_users", list_users)
    }

    async fn get_current_user(
        &self,
        request: Request<GetCurrentUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        info!("Gateway: GetCurrentUser");
        forward_authed!(self, request, "user", "get_current_user", get_current_user)
    }

    async fn register(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        info!("Gateway: Register");
        forward_public!(self, request, "user", "register", register)
    }

    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        info!("Gateway: Login");
        forward_public!(self, request, "user", "login", login)
    }

    async fn update_profile(
        &self,
        request: Request<UpdateProfileRequest>,
    ) -> Result<Response<UpdateProfileResponse>, Status> {
        info!("Gateway: UpdateProfile");
        forward_authed!(self, request, "user", "update_profile", update_profile)
    }
}
