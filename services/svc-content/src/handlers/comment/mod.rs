//! 评论 handler 模块
//!
//! 纯业务逻辑，不依赖 tonic Request/Response 类型。

use regex::Regex;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
};
use tonic::Status;
use uuid::Uuid;

use shared::entity::comments;
use shared::entity::prelude::Comments;
use shared::proto::Comment;
use shared::convert::{datetime_to_timestamp, user_model_to_proto};
use shared::extract::{parse_uuid, db_error};

// ────────────────────── 创建评论 ──────────────────────

/// 创建评论（顶级评论或二级回复）
/// 从 content 中解析 @mentions 并存入 mentions 字段
pub async fn create_comment(
    db: &DatabaseConnection,
    author_id: &str,
    article_id: &str,
    content: &str,
    parent_id: &str,
    reply_to_id: &str,
) -> Result<Comment, Status> {
    if content.trim().is_empty() {
        return Err(Status::invalid_argument("Comment content is required"));
    }

    let author_uuid = parse_uuid(author_id)?;
    let article_uuid = parse_uuid(article_id)?;

    // 验证文章存在
    let article_exists = shared::entity::prelude::Articles::find_by_id(article_uuid)
        .one(db)
        .await
        .map_err(db_error)?
        .is_some();
    if !article_exists {
        return Err(Status::not_found(format!(
            "Article '{article_id}' not found"
        )));
    }

    let parent_uuid = if parent_id.is_empty() {
        None
    } else {
        let pid = parse_uuid(parent_id)?;
        // 验证 parent 是顶级评论（parent_id 为 NULL）
        let parent = Comments::find_by_id(pid)
            .one(db)
            .await
            .map_err(db_error)?
            .ok_or_else(|| Status::not_found("Parent comment not found"))?;
        if parent.parent_id.is_some() {
            return Err(Status::invalid_argument(
                "Cannot reply to a reply (only 2 levels allowed)",
            ));
        }
        Some(pid)
    };

    let reply_to_uuid = if reply_to_id.is_empty() {
        None
    } else {
        Some(parse_uuid(reply_to_id)?)
    };

    // 从 content 中解析 @mentions
    let mentions = parse_mentions(content);

    let id = Uuid::new_v4();
    let now = chrono::Utc::now().fixed_offset();

    let active_model = comments::ActiveModel {
        id: ActiveValue::Set(id),
        article_id: ActiveValue::Set(article_uuid),
        author_id: ActiveValue::Set(author_uuid),
        content: ActiveValue::Set(content.to_string()),
        parent_id: ActiveValue::Set(parent_uuid),
        reply_to_id: ActiveValue::Set(reply_to_uuid),
        mentions: ActiveValue::Set(mentions.clone()),
        created_at: ActiveValue::Set(now),
        updated_at: ActiveValue::Set(now),
    };

    let model = active_model.insert(db).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to insert comment");
        Status::internal("Failed to create comment")
    })?;

    // 查询作者信息
    let author = load_user(db, author_uuid).await?;

    // 查询被回复者信息
    let reply_to_author = if let Some(rtid) = reply_to_uuid {
        let reply_comment = Comments::find_by_id(rtid).one(db).await.map_err(db_error)?;
        if let Some(rc) = reply_comment {
            Some(load_user(db, rc.author_id).await?)
        } else {
            None
        }
    } else {
        None
    };

    Ok(comment_model_to_proto(model, Some(author), reply_to_author, vec![]))
}

// ────────────────────── 评论列表 ──────────────────────

/// 获取文章评论列表（二级嵌套：先查顶级评论，再批量查子回复）
pub async fn list_comments(
    db: &DatabaseConnection,
    article_id: &str,
    page_size: i32,
    _page_token: &str,
) -> Result<(Vec<Comment>, String, i32), Status> {
    let article_uuid = parse_uuid(article_id)?;
    let limit = page_size.clamp(shared::constants::MIN_PAGE_SIZE, shared::constants::MAX_PAGE_SIZE) as u64;

    // 查询顶级评论（parent_id IS NULL）
    let top_comments = Comments::find()
        .filter(comments::Column::ArticleId.eq(article_uuid))
        .filter(comments::Column::ParentId.is_null())
        .order_by_asc(comments::Column::CreatedAt)
        .limit(limit)
        .all(db)
        .await
        .map_err(db_error)?;

    // 总数（所有评论，含回复）
    let total_count = Comments::find()
        .filter(comments::Column::ArticleId.eq(article_uuid))
        .count(db)
        .await
        .map_err(db_error)? as i32;

    // 批量查所有子回复
    let top_ids: Vec<Uuid> = top_comments.iter().map(|c| c.id).collect();
    let all_replies = if !top_ids.is_empty() {
        Comments::find()
            .filter(comments::Column::ParentId.is_in(top_ids.clone()))
            .order_by_asc(comments::Column::CreatedAt)
            .all(db)
            .await
            .map_err(db_error)?
    } else {
        vec![]
    };

    // 收集所有需要查询的 user_id
    let mut user_ids: Vec<Uuid> = top_comments.iter().map(|c| c.author_id).collect();
    for r in &all_replies {
        user_ids.push(r.author_id);
    }
    user_ids.sort();
    user_ids.dedup();

    // 批量查用户
    let users = load_users_batch(db, &user_ids).await?;

    // 组装结构
    let mut result = Vec::new();
    for top in top_comments {
        let author = users.get(&top.author_id).cloned();

        let replies: Vec<Comment> = all_replies
            .iter()
            .filter(|r| r.parent_id == Some(top.id))
            .map(|r| {
                let r_author = users.get(&r.author_id).cloned();
                // 查找 reply_to 的作者
                let rta = r.reply_to_id.and_then(|rtid| {
                    // 先在 top_comments 中找
                    if rtid == top.id {
                        return users.get(&top.author_id).cloned();
                    }
                    // 再在 all_replies 中找
                    all_replies
                        .iter()
                        .find(|rr| rr.id == rtid)
                        .and_then(|rr| users.get(&rr.author_id).cloned())
                });
                comment_model_to_proto(r.clone(), r_author, rta, vec![])
            })
            .collect();

        result.push(comment_model_to_proto(top, author, None, replies));
    }

    Ok((result, String::new(), total_count))
}

// ────────────────────── 删除评论 ──────────────────────

/// 删除评论（顶级评论级联删除子回复，由数据库 ON DELETE CASCADE 处理）
pub async fn delete_comment(
    db: &DatabaseConnection,
    caller_id: &str,
    comment_id: &str,
) -> Result<(), Status> {
    let uuid = parse_uuid(comment_id)?;

    let comment = Comments::find_by_id(uuid)
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found("Comment not found"))?;

    if comment.author_id.to_string() != caller_id {
        return Err(Status::permission_denied(
            "Only the author can delete this comment",
        ));
    }

    // 物理删除（顶级评论的子回复由 ON DELETE CASCADE 自动删除）
    let active: comments::ActiveModel = comment.into();
    active.delete(db).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to delete comment");
        Status::internal("Failed to delete comment")
    })?;

    Ok(())
}

// ────────────────────── @mentions 事件 ──────────────────────

/// 获取评论的 mentions 列表（供 service 层发 NATS 事件用）
pub fn get_mentions(content: &str) -> Vec<String> {
    parse_mentions(content)
}

// ────────────────────── 辅助函数 ──────────────────────

/// 从内容中解析 @username（字母/数字/下划线/连字符）
fn parse_mentions(content: &str) -> Vec<String> {
    let re = Regex::new(r"@([\w-]+)").unwrap();
    let mut mentions: Vec<String> = re
        .captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect();
    mentions.sort();
    mentions.dedup();
    mentions
}

/// 加载单个用户
async fn load_user(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<shared::proto::User, Status> {
    let user = shared::entity::prelude::Users::find_by_id(user_id)
        .one(db)
        .await
        .map_err(db_error)?
        .ok_or_else(|| Status::not_found("User not found"))?;
    Ok(user_model_to_proto(user))
}

/// 批量加载用户（返回 HashMap）
async fn load_users_batch(
    db: &DatabaseConnection,
    user_ids: &[Uuid],
) -> Result<std::collections::HashMap<Uuid, shared::proto::User>, Status> {
    use shared::entity::prelude::Users;
    use shared::entity::users;

    let models = Users::find()
        .filter(users::Column::Id.is_in(user_ids.to_vec()))
        .all(db)
        .await
        .map_err(db_error)?;

    let map = models
        .into_iter()
        .map(|m| {
            let id = m.id;
            (id, user_model_to_proto(m))
        })
        .collect();

    Ok(map)
}

fn comment_model_to_proto(
    model: comments::Model,
    author: Option<shared::proto::User>,
    reply_to_author: Option<shared::proto::User>,
    replies: Vec<Comment>,
) -> Comment {
    Comment {
        id: model.id.to_string(),
        article_id: model.article_id.to_string(),
        author_id: model.author_id.to_string(),
        content: model.content,
        parent_id: model.parent_id.map(|id| id.to_string()).unwrap_or_default(),
        reply_to_id: model
            .reply_to_id
            .map(|id| id.to_string())
            .unwrap_or_default(),
        mentions: model.mentions,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
        author,
        reply_to_author,
        replies,
    }
}
