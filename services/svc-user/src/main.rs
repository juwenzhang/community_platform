use tonic::{transport::Server, Request, Response, Status};
use tracing::info;

use shared::proto::user_service_server::{UserService, UserServiceServer};
use shared::proto::{GetUserRequest, GetUserResponse, User};

/// UserService gRPC 实现
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

        // Mock 数据
        let user = User {
            id: req.user_id.clone(),
            username: "luhanxin".to_string(),
            email: "hi@luhanxin.com".to_string(),
            display_name: "Luhanxin".to_string(),
            avatar_url: "https://blog.luhanxin.com/upload/D1F18B0567B5565BAAF031B586E3B56B.jpg".to_string(),
            bio: "Full-stack developer & community builder".to_string(),
            created_at: Some(prost_types::Timestamp {
                seconds: 1700000000,
                nanos: 0,
            }),
            updated_at: Some(prost_types::Timestamp {
                seconds: 1700000000,
                nanos: 0,
            }),
        };

        Ok(Response::new(GetUserResponse { user: Some(user) }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化 tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "svc_user=info,tower_http=info".parse().unwrap()),
        )
        .init();

    let port = std::env::var("SVC_USER_PORT").unwrap_or_else(|_| "50051".to_string());
    let addr = format!("0.0.0.0:{port}").parse()?;

    let user_service = UserServiceImpl::default();

    info!(%addr, "svc-user gRPC server starting");

    Server::builder()
        .add_service(UserServiceServer::new(user_service))
        .serve(addr)
        .await?;

    Ok(())
}
