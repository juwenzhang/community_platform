use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::user_service_server::UserService;
use shared::proto::{GetUserRequest, GetUserResponse};

use crate::handlers::user;

/// UserService gRPC 实现
///
/// 负责请求解析 + 调用 handler + 构造响应。
/// 业务逻辑在 handlers/user/ 中。
#[derive(Debug, Default)]
pub struct UserServiceImpl;

#[tonic::async_trait]
impl UserService for UserServiceImpl {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(user_id = %req.user_id, "GetUser called");

        let user = user::get_user_by_id(&req.user_id).await;

        Ok(Response::new(GetUserResponse { user: Some(user) }))
    }
}
