//! 社交互动数据访问层

use async_trait::async_trait;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Statement,
};
use uuid::Uuid;

use shared::entity::{articles, favorites, likes};
use shared::entity::prelude::{Articles, Favorites, Likes};

use super::RepositoryError;

#[async_trait]
pub trait SocialRepository: Send + Sync {
    async fn like_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>;
    async fn unlike_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>;
    async fn favorite_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>;
    async fn unfavorite_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>;
    async fn count_likes(&self, article_id: Uuid) -> Result<i32, RepositoryError>;
    async fn count_favorites(&self, article_id: Uuid) -> Result<i32, RepositoryError>;
    async fn is_liked(&self, user_id: Uuid, article_id: Uuid) -> Result<bool, RepositoryError>;
    async fn is_favorited(&self, user_id: Uuid, article_id: Uuid) -> Result<bool, RepositoryError>;
    async fn find_user_favorites(&self, user_id: Uuid, limit: u64) -> Result<Vec<articles::Model>, RepositoryError>;
}

pub struct SeaOrmSocialRepository {
    db: DatabaseConnection,
}

impl SeaOrmSocialRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SocialRepository for SeaOrmSocialRepository {
    async fn like_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError> {
        self.db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "INSERT INTO likes (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [user_id.into(), article_id.into()],
        )).await?;
        Ok(())
    }

    async fn unlike_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError> {
        self.db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "DELETE FROM likes WHERE user_id = $1 AND article_id = $2",
            [user_id.into(), article_id.into()],
        )).await?;
        Ok(())
    }

    async fn favorite_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError> {
        self.db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "INSERT INTO favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [user_id.into(), article_id.into()],
        )).await?;
        Ok(())
    }

    async fn unfavorite_article(&self, user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError> {
        self.db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "DELETE FROM favorites WHERE user_id = $1 AND article_id = $2",
            [user_id.into(), article_id.into()],
        )).await?;
        Ok(())
    }

    async fn count_likes(&self, article_id: Uuid) -> Result<i32, RepositoryError> {
        Ok(Likes::find()
            .filter(likes::Column::ArticleId.eq(article_id))
            .count(&self.db)
            .await? as i32)
    }

    async fn count_favorites(&self, article_id: Uuid) -> Result<i32, RepositoryError> {
        Ok(Favorites::find()
            .filter(favorites::Column::ArticleId.eq(article_id))
            .count(&self.db)
            .await? as i32)
    }

    async fn is_liked(&self, user_id: Uuid, article_id: Uuid) -> Result<bool, RepositoryError> {
        Ok(Likes::find()
            .filter(likes::Column::UserId.eq(user_id))
            .filter(likes::Column::ArticleId.eq(article_id))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn is_favorited(&self, user_id: Uuid, article_id: Uuid) -> Result<bool, RepositoryError> {
        Ok(Favorites::find()
            .filter(favorites::Column::UserId.eq(user_id))
            .filter(favorites::Column::ArticleId.eq(article_id))
            .one(&self.db)
            .await?
            .is_some())
    }

    async fn find_user_favorites(&self, user_id: Uuid, limit: u64) -> Result<Vec<articles::Model>, RepositoryError> {
        let fav_models = Favorites::find()
            .filter(favorites::Column::UserId.eq(user_id))
            .order_by_desc(favorites::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await?;

        let article_ids: Vec<Uuid> = fav_models.iter().map(|f| f.article_id).collect();
        if article_ids.is_empty() {
            return Ok(vec![]);
        }

        Ok(Articles::find()
            .filter(articles::Column::Id.is_in(article_ids))
            .all(&self.db)
            .await?)
    }
}
