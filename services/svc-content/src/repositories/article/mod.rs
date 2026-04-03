//! 文章数据访问层

use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect,
};
use uuid::Uuid;

use shared::entity::articles;
use shared::entity::prelude::Articles;

use super::RepositoryError;

#[async_trait]
pub trait ArticleRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<articles::Model>, RepositoryError>;
    async fn create(&self, model: articles::ActiveModel) -> Result<articles::Model, RepositoryError>;
    async fn update(&self, model: articles::ActiveModel) -> Result<articles::Model, RepositoryError>;
    async fn delete(&self, model: articles::ActiveModel) -> Result<(), RepositoryError>;
    async fn count_by_filter(&self, author_id: Option<Uuid>, status: Option<i16>) -> Result<i32, RepositoryError>;
}

pub struct SeaOrmArticleRepository {
    db: DatabaseConnection,
}

impl SeaOrmArticleRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ArticleRepository for SeaOrmArticleRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<articles::Model>, RepositoryError> {
        Ok(Articles::find_by_id(id).one(&self.db).await?)
    }

    async fn create(&self, model: articles::ActiveModel) -> Result<articles::Model, RepositoryError> {
        Ok(model.insert(&self.db).await?)
    }

    async fn update(&self, model: articles::ActiveModel) -> Result<articles::Model, RepositoryError> {
        Ok(model.update(&self.db).await?)
    }

    async fn delete(&self, model: articles::ActiveModel) -> Result<(), RepositoryError> {
        model.delete(&self.db).await?;
        Ok(())
    }

    async fn count_by_filter(&self, author_id: Option<Uuid>, status: Option<i16>) -> Result<i32, RepositoryError> {
        let mut query = Articles::find();
        if let Some(aid) = author_id {
            query = query.filter(articles::Column::AuthorId.eq(aid));
        }
        if let Some(s) = status {
            query = query.filter(articles::Column::Status.eq(s));
        }
        Ok(query.count(&self.db).await? as i32)
    }
}
