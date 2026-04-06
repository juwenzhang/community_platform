//! CommentService gRPC 实现

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tonic::{Request, Response, Status};
use tracing::info;

use shared::messaging::NatsClient;
use shared::proto::comment_service_server::CommentService;
use shared::proto::{
    CreateCommentRequest, CreateCommentResponse, DeleteCommentRequest, DeleteCommentResponse,
    ListCommentsRequest, ListCommentsResponse,
};

use crate::handlers::comment;

#[derive(Clone)]
pub struct CommentServiceImpl {
    db: Option<Arc<DatabaseConnection>>,
    nats: Option<Arc<NatsClient>>,
}

impl CommentServiceImpl {
    pub fn new(db: Option<Arc<DatabaseConnection>>, nats: Option<Arc<NatsClient>>) -> Self {
        Self { db, nats }
    }

    fn db(&self) -> Result<&DatabaseConnection, Status> {
        self.db
            .as_deref()
            .ok_or_else(shared::extract::db_unavailable)
    }
}

#[tonic::async_trait]
impl CommentService for CommentServiceImpl {
    async fn create_comment(
        &self,
        request: Request<CreateCommentRequest>,
    ) -> Result<Response<CreateCommentResponse>, Status> {
        let author_id = shared::extract::extract_user_id(&request)?;
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

        // 发布评论创建事件（用于通知系统）
        if let Some(nats) = &self.nats {
            let event_payload = serde_json::json!({
                "article_id": req.article_id,
                "comment_id": proto_comment.id,
                "author_id": author_id,
                "parent_id": req.parent_id,
                "reply_to_id": req.reply_to_id,
            });
            let payload_bytes = serde_json::to_vec(&event_payload).unwrap_or_default();
            if let Err(e) = nats.publish_bytes(shared::constants::NATS_EVENT_CONTENT_COMMENTED, payload_bytes).await {
                tracing::warn!(error = %e, "Failed to publish content.commented event");
            }
        }

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
                let subject = shared::constants::NATS_EVENT_CONTENT_MENTIONED;
                if let Err(e) = nats.publish_bytes(&subject, payload_bytes).await {
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
        info!(article_id = %req.article_id, sort = req.sort, "ListComments");

        let (comments, next_page_token, total_count) = comment::list_comments(
            self.db()?,
            &req.article_id,
            pagination.page_size,
            &pagination.page_token,
            req.sort,
            &req.cursor,
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
        let caller_id = shared::extract::extract_user_id(&request)?;
        let req = request.into_inner();
        info!(caller_id = %caller_id, comment_id = %req.comment_id, "DeleteComment");

        comment::delete_comment(self.db()?, &caller_id, &req.comment_id).await?;

        Ok(Response::new(DeleteCommentResponse {}))
    }
}
