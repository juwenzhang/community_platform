use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::GetUserRequest;
use shared::proto::GetUserResponse;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::user_service_server::UserService;

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

/// Gateway 作为 BFF 层实现 UserService trait，
/// 内部通过 gRPC 客户端调用 svc-user 微服务。
///
/// - 所有 RPC 调用经过 InterceptorPipeline 前置/后置拦截
/// - 服务地址通过 ServiceResolver（Consul + 连接池）动态解析
#[derive(Clone)]
pub struct GatewayUserService {
    pub(crate) resolver: Arc<ServiceResolver>,
    pub(crate) pipeline: Arc<InterceptorPipeline>,
}

impl GatewayUserService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }
}

#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let mut ctx = RpcContext::new("user", "get_user");

        // 1. 前置拦截（日志、认证、限流...）
        self.pipeline.run_pre(&mut ctx, request.metadata()).await?;

        // 2. 从连接池获取 Channel（Round Robin，Consul 动态解析）
        let req_inner = request.into_inner();
        info!(user_id = %req_inner.user_id, "Gateway: forwarding GetUser to svc-user");

        let result = async {
            let channel = self.resolver.get_channel("svc-user").await?;
            let mut client = UserServiceClient::new(channel);

            client
                .get_user(GetUserRequest {
                    user_id: req_inner.user_id,
                })
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "gRPC call to svc-user failed");
                    e
                })
        }
        .await;

        // 3. 后置拦截（日志、重试入队、事件发布...）
        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        self.pipeline.run_post(&ctx, &post_result).await?;

        result
    }
}
