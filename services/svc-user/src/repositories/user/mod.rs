//! 用户数据访问层
//!
//! 定义 `UserRepository` trait 抽象数据库操作，
//! `SeaOrmUserRepository` 是基于 SeaORM 的实现。

use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;

use shared::entity::prelude::Users;
use shared::entity::users;

// ── 错误类型 ──

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("Entity not found")]
    NotFound,
}

// ── Repository Trait ──

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<users::Model>, RepositoryError>;
    async fn find_by_username(
        &self,
        username: &str,
    ) -> Result<Option<users::Model>, RepositoryError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<users::Model>, RepositoryError>;
    async fn create(
        &self,
        model: users::ActiveModel,
    ) -> Result<users::Model, RepositoryError>;
    async fn update(
        &self,
        model: users::ActiveModel,
    ) -> Result<users::Model, RepositoryError>;
    async fn list_paginated(
        &self,
        query: &str,
        page_size: u64,
        page_token: &str,
    ) -> Result<(Vec<users::Model>, String, i32), RepositoryError>;
    async fn find_by_ids(
        &self,
        ids: &[Uuid],
    ) -> Result<Vec<users::Model>, RepositoryError>;
}

// ── SeaORM 实现 ──

pub struct SeaOrmUserRepository {
    db: DatabaseConnection,
}

impl SeaOrmUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl UserRepository for SeaOrmUserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<users::Model>, RepositoryError> {
        Ok(Users::find_by_id(id).one(&self.db).await?)
    }

    async fn find_by_username(
        &self,
        username: &str,
    ) -> Result<Option<users::Model>, RepositoryError> {
        Ok(Users::find()
            .filter(users::Column::Username.eq(username))
            .one(&self.db)
            .await?)
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<users::Model>, RepositoryError> {
        Ok(Users::find()
            .filter(users::Column::Email.eq(email))
            .one(&self.db)
            .await?)
    }

    async fn create(
        &self,
        model: users::ActiveModel,
    ) -> Result<users::Model, RepositoryError> {
        Ok(model.insert(&self.db).await?)
    }

    async fn update(
        &self,
        model: users::ActiveModel,
    ) -> Result<users::Model, RepositoryError> {
        Ok(model.update(&self.db).await?)
    }

    async fn list_paginated(
        &self,
        query: &str,
        page_size: u64,
        page_token: &str,
    ) -> Result<(Vec<users::Model>, String, i32), RepositoryError> {
        let mut base_filter = Users::find().order_by_desc(users::Column::CreatedAt);

        // 搜索过滤
        if !query.is_empty() {
            let pattern = format!("%{query}%");
            base_filter = base_filter.filter(
                users::Column::Username
                    .contains(&pattern)
                    .or(users::Column::DisplayName.contains(&pattern)),
            );
        }

        // 总数查询
        let total_count = base_filter.clone().count(&self.db).await? as i32;

        // 游标分页
        let mut paginated = base_filter;
        if !page_token.is_empty() {
            if let Ok(ts) = page_token.parse::<i64>() {
                if let Some(cursor_time) = chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.fixed_offset())
                {
                    paginated = paginated.filter(users::Column::CreatedAt.lt(cursor_time));
                }
            }
        }

        // 多取一条判断是否有下一页
        let models = paginated
            .limit(page_size + 1)
            .all(&self.db)
            .await?;

        let has_more = models.len() as u64 > page_size;
        let results: Vec<_> = models.into_iter().take(page_size as usize).collect();

        let next_page_token = if has_more {
            results
                .last()
                .map(|m| m.created_at.timestamp().to_string())
                .unwrap_or_default()
        } else {
            String::new()
        };

        Ok((results, next_page_token, total_count))
    }

    async fn find_by_ids(
        &self,
        ids: &[Uuid],
    ) -> Result<Vec<users::Model>, RepositoryError> {
        Ok(Users::find()
            .filter(users::Column::Id.is_in(ids.to_vec()))
            .all(&self.db)
            .await?)
    }
}
