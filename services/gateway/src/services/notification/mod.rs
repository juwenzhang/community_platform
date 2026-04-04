//! Gateway BFF 层 — NotificationService 转发
//!
//! 实现 NotificationService trait，所有 RPC 调用经过 InterceptorPipeline 拦截。
//! 所有方法都需要认证（透传 x-user-id）。

use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::notification_service_client::NotificationServiceClient;
use shared::proto::notification_service_server::NotificationService;
use shared::proto::{
    GetUnreadCountRequest, GetUnreadCountResponse, ListNotificationsRequest,
    ListNotificationsResponse, MarkAllAsReadRequest, MarkAllAsReadResponse, MarkAsReadRequest,
    MarkAsReadResponse,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

#[derive(Clone)]
pub struct GatewayNotificationService {
    pub(crate) resolver: Arc<ServiceResolver>,
    pub(crate) pipeline: Arc<InterceptorPipeline>,
}

impl GatewayNotificationService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }

    async fn client(
        &self,
    ) -> Result<NotificationServiceClient<tonic::transport::Channel>, Status> {
        let channel = self
            .resolver
            .get_channel(shared::constants::SVC_NOTIFICATION)
            .await?;
        Ok(NotificationServiceClient::new(channel))
    }

    fn inject_user_id<T>(ctx: &RpcContext, inner: T) -> Result<Request<T>, Status> {
        let user_id = ctx
            .attrs
            .get("user_id")
            .ok_or_else(|| Status::unauthenticated("Missing user_id in auth context"))?;

        let mut req = Request::new(inner);
        req.metadata_mut().insert(
            shared::constants::METADATA_USER_ID,
            user_id
                .parse()
                .map_err(|_| Status::internal("Invalid user_id format"))?,
        );
        Ok(req)
    }
}

/// 宏：需认证方法（透传 x-user-id）
macro_rules! forward_authed {
    ($self:expr, $request:expr, $ctx_method:expr, $rpc_call:ident) => {{
        let mut ctx = RpcContext::new("notification", $ctx_method);
        $self
            .pipeline
            .run_pre(&mut ctx, $request.metadata())
            .await?;

        let inner = $request.into_inner();
        let downstream_req = Self::inject_user_id(&ctx, inner)?;
        let result = $self.client().await?.$rpc_call(downstream_req).await;

        let post_result = result.as_ref().map(|_| ()).map_err(|e| e.clone());
        $self.pipeline.run_post(&ctx, &post_result).await?;
        result
    }};
}

#[tonic::async_trait]
impl NotificationService for GatewayNotificationService {
    async fn list_notifications(
        &self,
        request: Request<ListNotificationsRequest>,
    ) -> Result<Response<ListNotificationsResponse>, Status> {
        info!("Gateway: ListNotifications");
        forward_authed!(self, request, "list_notifications", list_notifications)
    }

    async fn get_unread_count(
        &self,
        request: Request<GetUnreadCountRequest>,
    ) -> Result<Response<GetUnreadCountResponse>, Status> {
        info!("Gateway: GetUnreadCount");
        forward_authed!(self, request, "get_unread_count", get_unread_count)
    }

    async fn mark_as_read(
        &self,
        request: Request<MarkAsReadRequest>,
    ) -> Result<Response<MarkAsReadResponse>, Status> {
        info!("Gateway: MarkAsRead");
        forward_authed!(self, request, "mark_as_read", mark_as_read)
    }

    async fn mark_all_as_read(
        &self,
        request: Request<MarkAllAsReadRequest>,
    ) -> Result<Response<MarkAllAsReadResponse>, Status> {
        info!("Gateway: MarkAllAsRead");
        forward_authed!(self, request, "mark_all_as_read", mark_all_as_read)
    }
}
