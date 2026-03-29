use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::user_service_server::UserService;
use shared::proto::{GetUserRequest, GetUserResponse};

use crate::handlers::user;

/// UserService gRPC 实现
///
/// 负责请求解析 + 调用 handler + 构造响应。
/// 业务逻辑在 handlers/user/ 中。
#[derive(Clone)]
pub struct UserServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
}

impl UserServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>) -> Self {
        Self { db }
    }
}

#[tonic::async_trait]
impl UserService for UserServiceImpl {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req = request.into_inner();
        info!(user_id = %req.user_id, "GetUser called");

        let Some(db) = &self.db else {
            return Err(Status::unavailable(
                "Database not available, service running in degraded mode",
            ));
        };

        let user = user::get_user_by_id(db, &req.user_id).await?;

        Ok(Response::new(GetUserResponse { user: Some(user) }))
    }
}
