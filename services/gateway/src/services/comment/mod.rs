//! Gateway BFF 层 — CommentService 透传
//!
//! 直接转发到 svc-content，经过 InterceptorPipeline 拦截。

use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::comment_service_client::CommentServiceClient;
use shared::proto::comment_service_server::CommentService;
use shared::proto::{
    CreateCommentRequest, CreateCommentResponse, DeleteCommentRequest, DeleteCommentResponse,
    ListCommentsRequest, ListCommentsResponse,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

#[derive(Clone)]
pub struct GatewayCommentService {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

impl GatewayCommentService {
    pub fn new(resolver: Arc<ServiceResolver>, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self { resolver, pipeline }
    }

    async fn client(&self) -> Result<CommentServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel("svc-content").await?;
        Ok(CommentServiceClient::new(channel))
    }

    fn inject_user_id<T>(ctx: &RpcContext, inner: T) -> Result<Request<T>, Status> {
        let mut req = Request::new(inner);
        if let Some(user_id) = ctx.attrs.get("user_id") {
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }
        }
        Ok(req)
    }
}

#[tonic::async_trait]
impl CommentService for GatewayCommentService {
    async fn create_comment(
        &self,
        request: Request<CreateCommentRequest>,
    ) -> Result<Response<CreateCommentResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("comment", "create_comment");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;

        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: CreateComment");

        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        let resp = client.create_comment(req).await?;
        Ok(resp)
    }

    async fn list_comments(
        &self,
        request: Request<ListCommentsRequest>,
    ) -> Result<Response<ListCommentsResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("comment", "list_comments");
        // 公开方法，拦截器不强制认证
        let _ = self.pipeline.run_pre(&mut ctx, &metadata).await;

        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: ListComments");

        let mut client = self.client().await?;
        let resp = client.list_comments(inner).await?;
        Ok(resp)
    }

    async fn delete_comment(
        &self,
        request: Request<DeleteCommentRequest>,
    ) -> Result<Response<DeleteCommentResponse>, Status> {
        let metadata = request.metadata().clone();
        let mut ctx = RpcContext::new("comment", "delete_comment");
        self.pipeline.run_pre(&mut ctx, &metadata).await?;

        let inner = request.into_inner();
        info!(comment_id = %inner.comment_id, "gRPC: DeleteComment");

        let req = Self::inject_user_id(&ctx, inner)?;
        let mut client = self.client().await?;
        let resp = client.delete_comment(req).await?;
        Ok(resp)
    }
}
