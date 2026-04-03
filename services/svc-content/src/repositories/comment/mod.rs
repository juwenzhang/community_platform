//! 评论数据访问层

use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect,
};
use uuid::Uuid;

use shared::entity::comments;
use shared::entity::prelude::Comments;

use super::RepositoryError;

#[async_trait]
pub trait CommentRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<comments::Model>, RepositoryError>;
    async fn create(&self, model: comments::ActiveModel) -> Result<comments::Model, RepositoryError>;
    async fn delete(&self, model: comments::ActiveModel) -> Result<(), RepositoryError>;
    async fn find_top_comments(&self, article_id: Uuid, limit: u64) -> Result<Vec<comments::Model>, RepositoryError>;
    async fn find_replies(&self, parent_ids: &[Uuid]) -> Result<Vec<comments::Model>, RepositoryError>;
    async fn count_by_article(&self, article_id: Uuid) -> Result<i32, RepositoryError>;
}

pub struct SeaOrmCommentRepository {
    db: DatabaseConnection,
}

impl SeaOrmCommentRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl CommentRepository for SeaOrmCommentRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<comments::Model>, RepositoryError> {
        Ok(Comments::find_by_id(id).one(&self.db).await?)
    }

    async fn create(&self, model: comments::ActiveModel) -> Result<comments::Model, RepositoryError> {
        Ok(model.insert(&self.db).await?)
    }

    async fn delete(&self, model: comments::ActiveModel) -> Result<(), RepositoryError> {
        model.delete(&self.db).await?;
        Ok(())
    }

    async fn find_top_comments(&self, article_id: Uuid, limit: u64) -> Result<Vec<comments::Model>, RepositoryError> {
        Ok(Comments::find()
            .filter(comments::Column::ArticleId.eq(article_id))
            .filter(comments::Column::ParentId.is_null())
            .order_by_asc(comments::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await?)
    }

    async fn find_replies(&self, parent_ids: &[Uuid]) -> Result<Vec<comments::Model>, RepositoryError> {
        if parent_ids.is_empty() {
            return Ok(vec![]);
        }
        Ok(Comments::find()
            .filter(comments::Column::ParentId.is_in(parent_ids.to_vec()))
            .order_by_asc(comments::Column::CreatedAt)
            .all(&self.db)
            .await?)
    }

    async fn count_by_article(&self, article_id: Uuid) -> Result<i32, RepositoryError> {
        Ok(Comments::find()
            .filter(comments::Column::ArticleId.eq(article_id))
            .count(&self.db)
            .await? as i32)
    }
}
