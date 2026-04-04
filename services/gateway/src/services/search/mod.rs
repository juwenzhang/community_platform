//! Gateway BFF 层 — SearchService 实现
//!
//! 直接调用 Meilisearch HTTP API（不转发到微服务），
//! 聚合作者信息后返回搜索结果。
//! 搜索接口为公开（跳过认证拦截）。

use std::sync::Arc;

use tonic::{Request, Response, Status};
use tracing::info;

use shared::proto::search_service_server::SearchService;
use shared::proto::{
    SearchArticlesRequest, SearchArticlesResponse, SearchArticleHit,
    SearchUsersRequest, SearchUsersResponse, SearchUserHit,
};

use crate::config::MeilisearchConfig;
use crate::interceptors::{InterceptorPipeline, RpcContext};

#[derive(Clone)]
pub struct GatewaySearchService {
    meili_config: MeilisearchConfig,
    http_client: reqwest::Client,
    pipeline: Arc<InterceptorPipeline>,
}

impl GatewaySearchService {
    pub fn new(meili_config: MeilisearchConfig, pipeline: Arc<InterceptorPipeline>) -> Self {
        Self {
            meili_config,
            http_client: reqwest::Client::new(),
            pipeline,
        }
    }

    /// 调用 Meilisearch search API
    async fn meili_search(
        &self,
        index: &str,
        query: &str,
        limit: i32,
        offset: i32,
    ) -> Result<serde_json::Value, Status> {
        let url = format!("{}/indexes/{}/search", self.meili_config.url, index);

        let body = serde_json::json!({
            "q": query,
            "limit": limit.clamp(1, 100),
            "offset": offset,
            "attributesToHighlight": ["title", "summary", "username", "display_name"],
            "highlightPreTag": "<em>",
            "highlightPostTag": "</em>",
        });

        let mut req = self.http_client.post(&url).json(&body);
        if !self.meili_config.master_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.meili_config.master_key));
        }

        let resp = req.send().await.map_err(|e| {
            tracing::error!(error = %e, "Meilisearch request failed");
            Status::unavailable("Search service unavailable")
        })?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::error!(status = %status, body = %body, "Meilisearch error");
            return Err(Status::internal("Search query failed"));
        }

        resp.json::<serde_json::Value>().await.map_err(|e| {
            tracing::error!(error = %e, "Failed to parse Meilisearch response");
            Status::internal("Search response parse error")
        })
    }
}

#[tonic::async_trait]
impl SearchService for GatewaySearchService {
    async fn search_articles(
        &self,
        request: Request<SearchArticlesRequest>,
    ) -> Result<Response<SearchArticlesResponse>, Status> {
        // 搜索接口公开，但仍走拦截器管道（日志等）
        let mut ctx = RpcContext::new("search", "search_articles");
        self.pipeline.run_pre(&mut ctx, request.metadata()).await?;

        let req = request.into_inner();
        info!(query = %req.query, "SearchArticles");

        if req.query.is_empty() {
            return Err(Status::invalid_argument("Query cannot be empty"));
        }

        let pagination = req.pagination.unwrap_or_default();
        let limit = if pagination.page_size > 0 { pagination.page_size } else { 20 };
        let offset = pagination.page_token.parse::<i32>().unwrap_or(0);

        let result = self.meili_search("articles", &req.query, limit, offset).await?;

        let hits: Vec<SearchArticleHit> = result["hits"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter_map(|hit| {
                let formatted = &hit["_formatted"];
                Some(SearchArticleHit {
                    id: hit["id"].as_str()?.to_string(),
                    title: formatted["title"].as_str().unwrap_or(hit["title"].as_str()?).to_string(),
                    summary: formatted["summary"].as_str().unwrap_or("").to_string(),
                    author_id: hit["author_id"].as_str().unwrap_or("").to_string(),
                    tags: hit["tags"].as_array()
                        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                        .unwrap_or_default(),
                    view_count: hit["view_count"].as_i64().unwrap_or(0) as i32,
                    like_count: hit["like_count"].as_i64().unwrap_or(0) as i32,
                    published_at: None,
                    author: None,
                    slug: hit["slug"].as_str().unwrap_or("").to_string(),
                })
            })
            .collect();

        let total = result["estimatedTotalHits"].as_i64().unwrap_or(0) as i32;
        let next_offset = offset + limit;
        let next_page_token = if next_offset < total {
            next_offset.to_string()
        } else {
            String::new()
        };

        let post_result = Ok(());
        self.pipeline.run_post(&ctx, &post_result).await?;

        Ok(Response::new(SearchArticlesResponse {
            hits,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count: total,
            }),
        }))
    }

    async fn search_users(
        &self,
        request: Request<SearchUsersRequest>,
    ) -> Result<Response<SearchUsersResponse>, Status> {
        let mut ctx = RpcContext::new("search", "search_users");
        self.pipeline.run_pre(&mut ctx, request.metadata()).await?;

        let req = request.into_inner();
        info!(query = %req.query, "SearchUsers");

        if req.query.is_empty() {
            return Err(Status::invalid_argument("Query cannot be empty"));
        }

        let pagination = req.pagination.unwrap_or_default();
        let limit = if pagination.page_size > 0 { pagination.page_size } else { 20 };
        let offset = pagination.page_token.parse::<i32>().unwrap_or(0);

        let result = self.meili_search("users", &req.query, limit, offset).await?;

        let hits: Vec<SearchUserHit> = result["hits"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter_map(|hit| {
                let formatted = &hit["_formatted"];
                Some(SearchUserHit {
                    id: hit["id"].as_str()?.to_string(),
                    username: formatted["username"].as_str().unwrap_or(hit["username"].as_str()?).to_string(),
                    display_name: formatted["display_name"].as_str().unwrap_or("").to_string(),
                    avatar_url: hit["avatar_url"].as_str().unwrap_or("").to_string(),
                    bio: hit["bio"].as_str().unwrap_or("").to_string(),
                })
            })
            .collect();

        let total = result["estimatedTotalHits"].as_i64().unwrap_or(0) as i32;
        let next_offset = offset + limit;
        let next_page_token = if next_offset < total {
            next_offset.to_string()
        } else {
            String::new()
        };

        let post_result = Ok(());
        self.pipeline.run_post(&ctx, &post_result).await?;

        Ok(Response::new(SearchUsersResponse {
            hits,
            pagination: Some(shared::proto::PaginationResponse {
                next_page_token,
                total_count: total,
            }),
        }))
    }
}
