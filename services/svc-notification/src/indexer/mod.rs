//! Meilisearch 索引同步模块
//!
//! 订阅 NATS 事件，异步同步文章和用户数据到 Meilisearch 索引。
//! 启动时执行一次全量同步（DB → Meilisearch），之后增量监听事件。

use std::sync::Arc;

use sea_orm::{DatabaseConnection, EntityTrait};
use tracing::{info, warn};

use shared::messaging::NatsClient;
use shared::proto::{Article, User};
use prost::Message;

/// Meilisearch 索引器
#[derive(Clone)]
pub struct MeiliIndexer {
    http_client: reqwest::Client,
    meili_url: String,
    meili_key: String,
}

impl MeiliIndexer {
    pub fn new(meili_url: &str, meili_key: &str) -> Self {
        Self {
            http_client: reqwest::Client::new(),
            meili_url: meili_url.to_string(),
            meili_key: meili_key.to_string(),
        }
    }

    /// 确保 Meilisearch 索引存在（不存在则创建）
    async fn ensure_index(&self, index: &str, primary_key: Option<&str>) {
        let url = format!("{}/indexes", self.meili_url);
        let mut body = serde_json::json!({ "uid": index });
        if let Some(pk) = primary_key {
            body["primaryKey"] = serde_json::json!(pk);
        }

        let mut req = self.http_client.post(&url).json(&body);
        if !self.meili_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.meili_key));
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                info!(index = %index, "Meilisearch index ensured");
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                // 409 = index already exists, 这是正常的
                if status.as_u16() == 409 {
                    info!(index = %index, "Meilisearch index already exists");
                } else {
                    warn!(index = %index, status = %status, body = %body, "Meilisearch ensure index failed");
                }
            }
            Err(e) => {
                warn!(index = %index, error = %e, "Meilisearch ensure index request failed");
            }
        }
    }

    /// 添加/更新文档到 Meilisearch 索引
    async fn upsert_document(&self, index: &str, doc: serde_json::Value) {
        let url = format!("{}/indexes/{}/documents", self.meili_url, index);
        let docs = serde_json::json!([doc]);

        let mut req = self.http_client.post(&url).json(&docs);
        if !self.meili_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.meili_key));
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                info!(index = %index, "Meilisearch document upserted");
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                warn!(index = %index, status = %status, body = %body, "Meilisearch upsert failed");
            }
            Err(e) => {
                warn!(index = %index, error = %e, "Meilisearch upsert request failed");
            }
        }
    }

    /// 批量添加/更新文档到 Meilisearch 索引
    async fn upsert_documents_batch(&self, index: &str, docs: &[serde_json::Value]) {
        if docs.is_empty() {
            return;
        }
        let url = format!("{}/indexes/{}/documents", self.meili_url, index);

        let mut req = self.http_client.post(&url).json(docs);
        if !self.meili_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.meili_key));
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                info!(index = %index, count = docs.len(), "Meilisearch batch upserted");
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                warn!(index = %index, status = %status, body = %body, "Meilisearch batch upsert failed");
            }
            Err(e) => {
                warn!(index = %index, error = %e, "Meilisearch batch upsert request failed");
            }
        }
    }

    /// 初始全量同步：从 DB 读取所有文章和用户，批量导入 Meilisearch
    pub async fn initial_sync(&self, db: &DatabaseConnection) {
        info!("Starting initial Meilisearch sync from database...");

        // 同步文章
        match shared::entity::prelude::Articles::find().all(db).await {
            Ok(articles) => {
                let docs: Vec<serde_json::Value> = articles
                    .iter()
                    .map(|a| {
                        serde_json::json!({
                            "id": a.id.to_string(),
                            "title": a.title,
                            "summary": a.summary,
                            "slug": a.slug,
                            "author_id": a.author_id.to_string(),
                            "tags": a.tags,
                            "view_count": a.view_count,
                            "like_count": a.like_count,
                        })
                    })
                    .collect();
                info!(count = docs.len(), "Syncing articles to Meilisearch");
                self.upsert_documents_batch("articles", &docs).await;
            }
            Err(e) => {
                warn!(error = %e, "Failed to load articles for initial sync");
            }
        }

        // 同步用户
        match shared::entity::prelude::Users::find().all(db).await {
            Ok(users) => {
                let docs: Vec<serde_json::Value> = users
                    .iter()
                    .map(|u| {
                        serde_json::json!({
                            "id": u.id.to_string(),
                            "username": u.username,
                            "display_name": u.display_name,
                            "avatar_url": u.avatar_url,
                            "bio": u.bio,
                        })
                    })
                    .collect();
                info!(count = docs.len(), "Syncing users to Meilisearch");
                self.upsert_documents_batch("users", &docs).await;
            }
            Err(e) => {
                warn!(error = %e, "Failed to load users for initial sync");
            }
        }

        info!("Initial Meilisearch sync complete");
    }

    /// 从 Meilisearch 索引删除文档
    async fn delete_document(&self, index: &str, doc_id: &str) {
        let url = format!("{}/indexes/{}/documents/{}", self.meili_url, index, doc_id);

        let mut req = self.http_client.delete(&url);
        if !self.meili_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.meili_key));
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                info!(index = %index, doc_id = %doc_id, "Meilisearch document deleted");
            }
            Ok(resp) => {
                let status = resp.status();
                warn!(index = %index, doc_id = %doc_id, status = %status, "Meilisearch delete failed");
            }
            Err(e) => {
                warn!(index = %index, error = %e, "Meilisearch delete request failed");
            }
        }
    }

    /// 处理文章发布/更新事件 → 同步到 articles 索引
    pub async fn handle_article_upsert(&self, payload: &[u8]) {
        let Ok(article) = Article::decode(payload) else {
            warn!("Failed to decode Article from event payload");
            return;
        };

        let doc = serde_json::json!({
            "id": article.id,
            "title": article.title,
            "summary": article.summary,
            "slug": article.slug,
            "author_id": article.author_id,
            "tags": article.tags,
            "view_count": article.view_count,
            "like_count": article.like_count,
        });

        self.upsert_document("articles", doc).await;
    }

    /// 处理文章删除事件 → 从 articles 索引移除
    pub async fn handle_article_delete(&self, payload: &[u8]) {
        let Ok(event) = serde_json::from_slice::<serde_json::Value>(payload) else {
            warn!("Failed to parse article delete event");
            return;
        };
        let article_id = event["article_id"].as_str().unwrap_or_default();
        if !article_id.is_empty() {
            self.delete_document("articles", article_id).await;
        }
    }

    /// 处理用户更新事件 → 同步到 users 索引
    pub async fn handle_user_upsert(&self, payload: &[u8]) {
        let Ok(user) = User::decode(payload) else {
            warn!("Failed to decode User from event payload");
            return;
        };

        let doc = serde_json::json!({
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
        });

        self.upsert_document("users", doc).await;
    }
}

/// 启动 Meilisearch 索引同步消费者（后台 tokio tasks）
pub async fn start_indexer(
    nats: Arc<NatsClient>,
    db: Option<Arc<DatabaseConnection>>,
    meili_url: &str,
    meili_key: &str,
) {
    let indexer = MeiliIndexer::new(meili_url, meili_key);

    // 确保索引存在（首次启动自动创建）
    indexer.ensure_index("articles", Some("id")).await;
    indexer.ensure_index("users", Some("id")).await;

    // 启动时全量同步（DB → Meilisearch）
    if let Some(db_ref) = db.as_ref() {
        indexer.initial_sync(db_ref).await;
    } else {
        warn!("Database not available, skipping initial Meilisearch sync");
    }

    // 文章发布事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_CONTENT_PUBLISHED).await {
        let idx = indexer.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("Meilisearch indexer started: content.published");
            while let Some(msg) = sub.next().await {
                idx.handle_article_upsert(&msg.payload).await;
            }
        });
    }

    // 文章更新事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_CONTENT_UPDATED).await {
        let idx = indexer.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("Meilisearch indexer started: content.updated");
            while let Some(msg) = sub.next().await {
                idx.handle_article_upsert(&msg.payload).await;
            }
        });
    }

    // 文章删除事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_CONTENT_DELETED).await {
        let idx = indexer.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("Meilisearch indexer started: content.deleted");
            while let Some(msg) = sub.next().await {
                idx.handle_article_delete(&msg.payload).await;
            }
        });
    }

    // 用户更新事件
    if let Ok(mut sub) = nats.subscribe(shared::constants::NATS_EVENT_USER_UPDATED).await {
        let idx = indexer.clone();
        tokio::spawn(async move {
            use futures::StreamExt;
            info!("Meilisearch indexer started: user.updated");
            while let Some(msg) = sub.next().await {
                idx.handle_user_upsert(&msg.payload).await;
            }
        });
    }

    info!("Meilisearch indexer consumers started");
}
