//! CommentService gRPC 实现

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::comment_service_server::CommentService;
use shared::proto::{
    CreateCommentRequest, CreateCommentResponse, DeleteCommentRequest, DeleteCommentResponse,
    ListCommentsRequest, ListCommentsResponse,
};

use crate::handlers::comment;

fn db_unavailable() -> Status {
    Status::unavailable("Database not available, service running in degraded mode")
}

fn extract_user_id(metadata: &tonic::metadata::MetadataMap) -> Result<String, Status> {
    metadata
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing x-user-id metadata"))
}

#[derive(Clone)]
pub struct CommentServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    nats: Option<async_nats::Client>,
}

impl CommentServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>, nats: Option<async_nats::Client>) -> Self {
        Self { db, nats }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db.as_deref().ok_or_else(db_unavailable)
    }
}

#[tonic::async_trait]
impl CommentService for CommentServiceImpl {
    async fn create_comment(
        &self,
        request: Request<CreateCommentRequest>,
    ) -> Result<Response<CreateCommentResponse>, Status> {
        let author_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(author_id = %author_id, article_id = %req.article_id, "CreateComment");

        let proto_comment = comment::create_comment(
            self.db()?,
            &author_id,
            &req.article_id,
            &req.content,
            &req.parent_id,
            &req.reply_to_id,
        )
        .await?;

        // 如果有 @mentions，发布 NATS 事件
        let mentions = comment::get_mentions(&req.content);
        if !mentions.is_empty() {
            if let Some(nats) = &self.nats {
                let event_payload = serde_json::json!({
                    "article_id": req.article_id,
                    "comment_id": proto_comment.id,
                    "author_id": author_id,
                    "mentions": mentions,
                });
                let payload_bytes = serde_json::to_vec(&event_payload).unwrap_or_default();
                if let Err(e) = nats
                    .publish("luhanxin.events.comment.mentioned", payload_bytes.into())
                    .await
                {
                    tracing::warn!(error = %e, "Failed to publish comment.mentioned event");
                }
            }
        }

        Ok(Response::new(CreateCommentResponse {
            comment: Some(proto_comment),
        }))
    }

    async fn list_comments(
        &self,
        request: Request<ListCommentsRequest>,
    ) -> Result<Response<ListCommentsResponse>, Status> {
        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_default();
        info!(article_id = %req.article_id, "ListComments");

        let (comments, next_page_token, total_count) = comment::list_comments(
            self.db()?,
            &req.article_id,
            pagination.page_size,
            &pagination.page_token,
        )
        .await?;

        Ok(Response::new(ListCommentsResponse {
            comments,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count,
            }),
        }))
    }

    async fn delete_comment(
        &self,
        request: Request<DeleteCommentRequest>,
    ) -> Result<Response<DeleteCommentResponse>, Status> {
        let caller_id = extract_user_id(request.metadata())?;
        let req = request.into_inner();
        info!(caller_id = %caller_id, comment_id = %req.comment_id, "DeleteComment");

        comment::delete_comment(self.db()?, &caller_id, &req.comment_id).await?;

        Ok(Response::new(DeleteCommentResponse {}))
    }
}
