//! 文章 handler 模块
//!
//! 纯业务逻辑，不依赖 tonic Request/Response 类型。

use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect,
};
use tonic::Status;
use uuid::Uuid;

use shared::entity::articles;
use shared::entity::prelude::Articles;
use shared::proto::{Article, ArticleStatus};

// ────────────────────── 查询 ──────────────────────

/// 获取文章详情（含异步自增 view_count）
pub async fn get_article(db: &DatabaseConnection, article_id: &str) -> Result<Article, Status> {
    let uuid = parse_uuid(article_id)?;

    let model = Articles::find_by_id(uuid)
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found(format!("Article '{article_id}' not found")))?;

    // 异步自增 view_count，不阻塞响应
    let db_clone = db.clone();
    tokio::spawn(async move {
        if let Err(e) = increment_view_count(&db_clone, uuid).await {
            tracing::warn!(error = %e, "Failed to increment view_count");
        }
    });

    Ok(article_model_to_proto(model))
}

/// 文章列表（query 搜索 + tag 筛选 + 草稿可见性 + 游标分页 + total_count）
#[allow(clippy::too_many_arguments)]
pub async fn list_articles(
    db: &DatabaseConnection,
    author_id: &str,
    query: &str,
    tag: &str,
    categories: &[i32],
    caller_id: Option<&str>,
    page_size: i32,
    page_token: &str,
) -> Result<(Vec<Article>, String, i32), Status> {
    let limit = page_size.clamp(1, 100) as u64;

    let mut base_query = Articles::find();

    // 作者筛选 + 草稿可见性
    if !author_id.is_empty() {
        let author_uuid = parse_uuid(author_id)?;
        base_query = base_query.filter(articles::Column::AuthorId.eq(author_uuid));

        // 只有作者本人能看到自己的草稿
        let is_self = caller_id.is_some_and(|c| c == author_id);
        if !is_self {
            base_query =
                base_query.filter(articles::Column::Status.eq(ArticleStatus::Published as i16));
        }
    } else {
        // 公开列表：只显示已发布
        base_query =
            base_query.filter(articles::Column::Status.eq(ArticleStatus::Published as i16));
    }

    // pg_trgm 相似度搜索（title + content）
    let has_query = !query.is_empty();
    if has_query {
        let pattern = format!("%{query}%");
        // ILIKE 匹配 title 或 content，OR similarity(title, query) > 0.1
        base_query = base_query.filter(
            sea_orm::Condition::any()
                .add(articles::Column::Title.like(&pattern))
                .add(articles::Column::Content.like(&pattern))
                .add(sea_orm::prelude::Expr::cust_with_values(
                    "similarity(title, $1) > 0.1",
                    [query.to_string()],
                )),
        );
    }

    // 标签筛选（PostgreSQL array contains: tags @> ARRAY['tag']）
    if !tag.is_empty() {
        base_query = base_query.filter(
            sea_orm::prelude::Expr::cust_with_values("tags @> $1::text[]", [format!("{{{tag}}}")]),
        );
    }

    // 分类筛选（数组 overlap：文章的 categories 与请求的 categories 有交集）
    let valid_categories: Vec<i16> = categories
        .iter()
        .filter(|&&c| c != 0)
        .map(|&c| c as i16)
        .collect();
    if !valid_categories.is_empty() {
        let cat_str = valid_categories.iter().map(|c| c.to_string()).collect::<Vec<_>>().join(",");
        base_query = base_query.filter(
            sea_orm::prelude::Expr::cust_with_values(
                "categories && $1::smallint[]",
                [format!("{{{cat_str}}}")],
            ),
        );
    }

    // 排序：有 query 时按相似度排序，否则按时间排序
    if has_query {
        base_query = base_query.order_by_desc(sea_orm::prelude::Expr::cust_with_values(
            "similarity(title, $1)",
            [query.to_string()],
        ));
    } else if !author_id.is_empty() {
        base_query = base_query.order_by_desc(articles::Column::CreatedAt);
    } else {
        base_query = base_query.order_by_desc(articles::Column::PublishedAt);
    }

    // 总数查询
    let total_count = base_query.clone().count(db).await.map_err(db_error)? as i32;

    // 游标分页
    let mut paginated = base_query;
    if !page_token.is_empty() {
        if let Ok(ts) = page_token.parse::<i64>() {
            let cursor_time = chrono::DateTime::from_timestamp(ts, 0)
                .map(|dt| dt.fixed_offset())
                .ok_or_else(|| Status::invalid_argument("Invalid page_token"))?;
            if !author_id.is_empty() {
                paginated = paginated.filter(articles::Column::CreatedAt.lt(cursor_time));
            } else {
                paginated = paginated.filter(articles::Column::PublishedAt.lt(cursor_time));
            }
        }
    }

    // 多取一条判断是否有下一页
    let models = paginated
        .limit(limit + 1)
        .all(db)
        .await
        .map_err(db_error)?;

    let has_more = models.len() as u64 > limit;
    let results: Vec<_> = models.into_iter().take(limit as usize).collect();

    let next_page_token = if has_more {
        results
            .last()
            .map(|m| {
                if !author_id.is_empty() {
                    m.created_at.timestamp().to_string()
                } else {
                    m.published_at
                        .map(|t| t.timestamp().to_string())
                        .unwrap_or_default()
                }
            })
            .unwrap_or_default()
    } else {
        String::new()
    };

    let articles: Vec<Article> = results.into_iter().map(article_model_to_proto).collect();

    Ok((articles, next_page_token, total_count))
}

// ────────────────────── 写入 ──────────────────────

/// 创建文章
#[allow(clippy::too_many_arguments)]
pub async fn create_article(
    db: &DatabaseConnection,
    author_id: &str,
    title: &str,
    content: &str,
    summary: &str,
    tags: &[String],
    status: i32,
    categories: &[i32],
) -> Result<Article, Status> {
    if title.is_empty() {
        return Err(Status::invalid_argument("Title is required"));
    }
    if content.is_empty() {
        return Err(Status::invalid_argument("Content is required"));
    }

    let author_uuid = parse_uuid(author_id)?;
    let id = Uuid::new_v4();
    let slug = id.to_string()[..8].to_string();

    // summary 为空时自动截取 content 前 200 字
    let auto_summary = if summary.is_empty() {
        content.chars().take(200).collect::<String>()
    } else {
        summary.to_string()
    };

    let article_status = ArticleStatus::try_from(status).unwrap_or(ArticleStatus::Draft);
    let cat_values: Vec<i16> = categories.iter().filter(|&&c| c != 0).map(|&c| c as i16).collect();
    let now = chrono::Utc::now().fixed_offset();

    let published_at = if article_status == ArticleStatus::Published {
        ActiveValue::Set(Some(now))
    } else {
        ActiveValue::Set(None)
    };

    let active_model = articles::ActiveModel {
        id: ActiveValue::Set(id),
        title: ActiveValue::Set(title.to_string()),
        slug: ActiveValue::Set(slug),
        summary: ActiveValue::Set(auto_summary),
        content: ActiveValue::Set(content.to_string()),
        author_id: ActiveValue::Set(author_uuid),
        tags: ActiveValue::Set(tags.to_vec()),
        view_count: ActiveValue::Set(0),
        like_count: ActiveValue::Set(0),
        status: ActiveValue::Set(article_status as i16),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
        published_at,
        categories: ActiveValue::Set(cat_values),
    };

    let model = active_model.insert(db).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to insert article");
        Status::internal("Failed to create article")
    })?;

    Ok(article_model_to_proto(model))
}

/// 更新文章（author_id 权限校验）
#[allow(clippy::too_many_arguments)]
pub async fn update_article(
    db: &DatabaseConnection,
    caller_id: &str,
    article_id: &str,
    title: &str,
    content: &str,
    summary: &str,
    tags: &[String],
    status: i32,
    categories: &[i32],
) -> Result<Article, Status> {
    let uuid = parse_uuid(article_id)?;

    let existing = Articles::find_by_id(uuid)
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found(format!("Article '{article_id}' not found")))?;

    // 权限校验：只有作者能编辑
    if existing.author_id.to_string() != caller_id {
        return Err(Status::permission_denied(
            "Only the author can edit this article",
        ));
    }

    let now = chrono::Utc::now().fixed_offset();
    let mut active: articles::ActiveModel = existing.into();

    // 只更新非空字段
    if !title.is_empty() {
        active.title = ActiveValue::Set(title.to_string());
    }
    if !content.is_empty() {
        active.content = ActiveValue::Set(content.to_string());
    }
    if !summary.is_empty() {
        active.summary = ActiveValue::Set(summary.to_string());
    }
    if !tags.is_empty() {
        active.tags = ActiveValue::Set(tags.to_vec());
    }

    let article_status = ArticleStatus::try_from(status).unwrap_or(ArticleStatus::Unspecified);
    if article_status != ArticleStatus::Unspecified {
        active.status = ActiveValue::Set(article_status as i16);

        // 如果从草稿变为发布，设置 published_at
        if article_status == ArticleStatus::Published {
            active.published_at = ActiveValue::Set(Some(now));
        }
    }

    if !categories.is_empty() {
        let cat_values: Vec<i16> = categories.iter().filter(|&&c| c != 0).map(|&c| c as i16).collect();
        active.categories = ActiveValue::Set(cat_values);
    }

    active.updated_at = ActiveValue::Set(now);

    let model = active.update(db).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to update article");
        Status::internal("Failed to update article")
    })?;

    Ok(article_model_to_proto(model))
}

/// 删除文章
/// - 非归档文章：软删除（status → ARCHIVED）
/// - 已归档文章：物理删除（从数据库移除）
pub async fn delete_article(
    db: &DatabaseConnection,
    caller_id: &str,
    article_id: &str,
) -> Result<(), Status> {
    let uuid = parse_uuid(article_id)?;

    let existing = Articles::find_by_id(uuid)
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found(format!("Article '{article_id}' not found")))?;

    // 权限校验：只有作者能删除
    if existing.author_id.to_string() != caller_id {
        return Err(Status::permission_denied(
            "Only the author can delete this article",
        ));
    }

    if existing.status == ArticleStatus::Archived as i16 {
        // 已归档 → 物理删除
        let active: articles::ActiveModel = existing.into();
        active.delete(db).await.map_err(|e| {
            tracing::error!(error = %e, "Failed to permanently delete article");
            Status::internal("Failed to permanently delete article")
        })?;
    } else {
        // 非归档 → 软删除（ARCHIVED）
        let now = chrono::Utc::now().fixed_offset();
        let mut active: articles::ActiveModel = existing.into();
        active.status = ActiveValue::Set(ArticleStatus::Archived as i16);
        active.updated_at = ActiveValue::Set(now);
        active.update(db).await.map_err(|e| {
            tracing::error!(error = %e, "Failed to archive article");
            Status::internal("Failed to delete article")
        })?;
    }

    Ok(())
}

// ────────────────────── 辅助函数 ──────────────────────

/// 异步自增 view_count
async fn increment_view_count(
    db: &DatabaseConnection,
    article_id: Uuid,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::sea_query::Expr;
    use sea_orm::UpdateResult;

    let _: UpdateResult = Articles::update_many()
        .filter(articles::Column::Id.eq(article_id))
        .col_expr(
            articles::Column::ViewCount,
            Expr::col(articles::Column::ViewCount).add(1),
        )
        .exec(db)
        .await?;

    Ok(())
}

/// Entity Model → Proto Article 转换
fn article_model_to_proto(model: articles::Model) -> Article {
    Article {
        id: model.id.to_string(),
        title: model.title,
        slug: model.slug,
        summary: model.summary,
        content: model.content,
        author_id: model.author_id.to_string(),
        tags: model.tags,
        view_count: model.view_count,
        like_count: model.like_count,
        status: model.status as i32,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
        published_at: model.published_at.map(datetime_to_timestamp),
        author: None, // Gateway BFF 层填充
        categories: model.categories.iter().map(|&c| c as i32).collect(),
    }
}

/// chrono DateTime → prost Timestamp 转换
fn datetime_to_timestamp(dt: chrono::DateTime<chrono::FixedOffset>) -> prost_types::Timestamp {
    prost_types::Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

/// 解析 UUID
fn parse_uuid(id: &str) -> Result<Uuid, Status> {
    Uuid::parse_str(id)
        .map_err(|_| Status::invalid_argument(format!("Invalid UUID format: '{id}'")))
}

/// 数据库错误转换
fn db_error(e: sea_orm::DbErr) -> Status {
    tracing::error!(error = %e, "Database query failed");
    Status::internal("Database query failed")
}
