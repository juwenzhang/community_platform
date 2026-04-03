//! 社交互动 handler 模块
//!
//! 点赞/收藏的纯业务逻辑。

use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Statement,
};
use tonic::Status;
use uuid::Uuid;

use shared::entity::{articles, favorites, likes};
use shared::entity::prelude::{Articles, Favorites, Likes};
use shared::proto::Article;
use shared::convert::article_model_to_proto;
use shared::extract::{parse_uuid, db_error};

// ────────────────────── 点赞 ──────────────────────

/// 点赞文章（幂等：INSERT ON CONFLICT DO NOTHING）
pub async fn like_article(
    db: &DatabaseConnection,
    user_id: &str,
    article_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;
    let article_uuid = parse_uuid(article_id)?;

    // INSERT ON CONFLICT DO NOTHING
    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "INSERT INTO likes (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [user_uuid.into(), article_uuid.into()],
    ))
    .await
    .map_err(db_error)?;

    // 精确计数更新
    let count = update_like_count(db, article_uuid).await?;
    Ok(count)
}

/// 取消点赞（幂等）
pub async fn unlike_article(
    db: &DatabaseConnection,
    user_id: &str,
    article_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;
    let article_uuid = parse_uuid(article_id)?;

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "DELETE FROM likes WHERE user_id = $1 AND article_id = $2",
        [user_uuid.into(), article_uuid.into()],
    ))
    .await
    .map_err(db_error)?;

    let count = update_like_count(db, article_uuid).await?;
    Ok(count)
}

// ────────────────────── 收藏 ──────────────────────

/// 收藏文章（幂等）
pub async fn favorite_article(
    db: &DatabaseConnection,
    user_id: &str,
    article_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;
    let article_uuid = parse_uuid(article_id)?;

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "INSERT INTO favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [user_uuid.into(), article_uuid.into()],
    ))
    .await
    .map_err(db_error)?;

    let count = count_favorites(db, article_uuid).await?;
    Ok(count)
}

/// 取消收藏（幂等）
pub async fn unfavorite_article(
    db: &DatabaseConnection,
    user_id: &str,
    article_id: &str,
) -> Result<i32, Status> {
    let user_uuid = parse_uuid(user_id)?;
    let article_uuid = parse_uuid(article_id)?;

    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "DELETE FROM favorites WHERE user_id = $1 AND article_id = $2",
        [user_uuid.into(), article_uuid.into()],
    ))
    .await
    .map_err(db_error)?;

    let count = count_favorites(db, article_uuid).await?;
    Ok(count)
}

// ────────────────────── 互动状态 ──────────────────────

/// 获取当前用户对文章的互动状态
pub async fn get_article_interaction(
    db: &DatabaseConnection,
    user_id: Option<&str>,
    article_id: &str,
) -> Result<(bool, bool, i32, i32), Status> {
    let article_uuid = parse_uuid(article_id)?;

    let (liked, favorited) = if let Some(uid) = user_id {
        let user_uuid = parse_uuid(uid)?;

        let liked = Likes::find()
            .filter(likes::Column::UserId.eq(user_uuid))
            .filter(likes::Column::ArticleId.eq(article_uuid))
            .one(db)
            .await
            .map_err(db_error)?
            .is_some();

        let favorited = Favorites::find()
            .filter(favorites::Column::UserId.eq(user_uuid))
            .filter(favorites::Column::ArticleId.eq(article_uuid))
            .one(db)
            .await
            .map_err(db_error)?
            .is_some();

        (liked, favorited)
    } else {
        (false, false)
    };

    let like_count = Likes::find()
        .filter(likes::Column::ArticleId.eq(article_uuid))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    let favorite_count = Favorites::find()
        .filter(favorites::Column::ArticleId.eq(article_uuid))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    Ok((liked, favorited, like_count, favorite_count))
}

// ────────────────────── 收藏列表 ──────────────────────

/// 获取用户收藏的文章列表
pub async fn list_favorites(
    db: &DatabaseConnection,
    user_id: &str,
    page_size: i32,
    _page_token: &str,
) -> Result<(Vec<Article>, String, i32), Status> {
    let user_uuid = parse_uuid(user_id)?;
    let limit = page_size.clamp(shared::constants::MIN_PAGE_SIZE, shared::constants::MAX_PAGE_SIZE) as u64;

    // 查 favorites 按时间倒序
    let fav_models = Favorites::find()
        .filter(favorites::Column::UserId.eq(user_uuid))
        .order_by_desc(favorites::Column::CreatedAt)
        .limit(limit)
        .all(db)
        .await
        .map_err(db_error)?;

    let total_count = Favorites::find()
        .filter(favorites::Column::UserId.eq(user_uuid))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    // 批量查文章
    let article_ids: Vec<Uuid> = fav_models.iter().map(|f| f.article_id).collect();
    let articles_models = if !article_ids.is_empty() {
        Articles::find()
            .filter(articles::Column::Id.is_in(article_ids.clone()))
            .all(db)
            .await
            .map_err(db_error)?
    } else {
        vec![]
    };

    // 按收藏顺序排列
    let article_map: std::collections::HashMap<Uuid, articles::Model> = articles_models
        .into_iter()
        .map(|a| (a.id, a))
        .collect();

    let articles: Vec<Article> = article_ids
        .iter()
        .filter_map(|id| article_map.get(id).cloned())
        .map(article_model_to_proto)
        .collect();

    Ok((articles, String::new(), total_count))
}

// ────────────────────── 辅助函数 ──────────────────────

/// 精确计数更新 articles.like_count
async fn update_like_count(db: &DatabaseConnection, article_id: Uuid) -> Result<i32, Status> {
    db.execute(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "UPDATE articles SET like_count = (SELECT COUNT(*) FROM likes WHERE article_id = $1) WHERE id = $1",
        [article_id.into()],
    ))
    .await
    .map_err(db_error)?;

    let count = Likes::find()
        .filter(likes::Column::ArticleId.eq(article_id))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    Ok(count)
}

/// 统计收藏数
async fn count_favorites(db: &DatabaseConnection, article_id: Uuid) -> Result<i32, Status> {
    let count = Favorites::find()
        .filter(favorites::Column::ArticleId.eq(article_id))
        .count(db)
        .await
        .map_err(db_error)? as i32;
    Ok(count)
}
