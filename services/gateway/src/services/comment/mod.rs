//! Gateway BFF 层 — CommentService
//!
//! 转发到 svc-content，经过 InterceptorPipeline 拦截。
//! ListComments 转发后，批量调 svc-user 获取评论者信息填入 Comment.author。

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::comment_service_client::CommentServiceClient;
use shared::proto::comment_service_server::CommentService;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::{
    Comment, CreateCommentRequest, CreateCommentResponse, DeleteCommentRequest,
    DeleteCommentResponse, GetUserRequest, ListCommentsRequest, ListCommentsResponse, User,
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
        let channel = self.resolver.get_channel(shared::constants::SVC_CONTENT).await?;
        Ok(CommentServiceClient::new(channel))
    }

    async fn user_client(&self) -> Result<UserServiceClient<tonic::transport::Channel>, Status> {
        let channel = self.resolver.get_channel(shared::constants::SVC_USER).await?;
        Ok(UserServiceClient::new(channel))
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

    /// BFF 聚合：批量获取评论者信息填入评论列表
    async fn fill_comment_authors(&self, comments: &mut [Comment]) {
        // 递归收集所有 author_id（包括 replies）
        let mut author_ids = HashSet::new();
        fn collect_ids(comments: &[Comment], ids: &mut HashSet<String>) {
            for c in comments {
                if !c.author_id.is_empty() {
                    ids.insert(c.author_id.clone());
                }
                collect_ids(&c.replies, ids);
            }
        }
        collect_ids(comments, &mut author_ids);

        if author_ids.is_empty() {
            return;
        }

        let mut user_client = match self.user_client().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to get user client for comment authors");
                return;
            }
        };

        let mut user_map: HashMap<String, User> = HashMap::new();
        for author_id in &author_ids {
            match user_client
                .get_user(GetUserRequest {
                    user_id: author_id.clone(),
                })
                .await
            {
                Ok(resp) => {
                    if let Some(user) = resp.into_inner().user {
                        user_map.insert(author_id.clone(), user);
                    }
                }
                Err(e) => {
                    tracing::warn!(author_id = %author_id, error = %e, "Failed to fetch comment author");
                }
            }
        }

        // 递归填充 author 字段
        fn fill_authors(comments: &mut [Comment], user_map: &HashMap<String, User>) {
            for c in comments {
                if let Some(user) = user_map.get(&c.author_id) {
                    c.author = Some(user.clone());
                }
                fill_authors(&mut c.replies, user_map);
            }
        }
        fill_authors(comments, &user_map);
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
        let _ = self.pipeline.run_pre(&mut ctx, &metadata).await;

        let inner = request.into_inner();
        info!(article_id = %inner.article_id, "gRPC: ListComments");

        let mut client = self.client().await?;
        let mut resp = client.list_comments(inner).await?.into_inner();

        // BFF 聚合：填充评论者信息
        self.fill_comment_authors(&mut resp.comments).await;

        Ok(Response::new(resp))
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
