//! 文章 REST Proxy
//!
//! 将 gRPC ArticleService 方法暴露为 REST + JSON 端点，
//! 自动集成到 Swagger UI 文档中。

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use tonic::metadata::MetadataMap;
use tracing::{error, info};
use utoipa::ToSchema;

use shared::proto::article_service_client::ArticleServiceClient;
use shared::proto::{
    CreateArticleRequest, DeleteArticleRequest, GetArticleRequest, ListArticlesRequest,
    UpdateArticleRequest,
};

use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

// ────────────────────────────────────────────
// Swagger DTO
// ────────────────────────────────────────────

/// 文章信息
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ArticleDto {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub summary: String,
    pub content: String,
    pub author_id: String,
    pub tags: Vec<String>,
    pub view_count: i32,
    pub like_count: i32,
    pub status: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub published_at: Option<String>,
    pub author: Option<super::super::routes::user::UserDto>,
}

/// 获取文章响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetArticleDto {
    pub article: Option<ArticleDto>,
}

/// 文章列表响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ListArticlesDto {
    pub articles: Vec<ArticleDto>,
    pub next_page_token: String,
    pub total_count: i32,
}

/// 文章列表查询参数
#[derive(Deserialize, ToSchema)]
pub struct ListArticlesQuery {
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
    pub author_id: Option<String>,
    pub query: Option<String>,
    pub tag: Option<String>,
    pub categories: Option<Vec<i32>>,
}

/// 创建文章请求
#[derive(Deserialize, ToSchema)]
pub struct CreateArticleDto {
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<i32>,
    pub categories: Option<Vec<i32>>,
}

/// 更新文章请求
#[derive(Deserialize, ToSchema)]
pub struct UpdateArticleDto {
    pub title: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<i32>,
    pub categories: Option<Vec<i32>>,
}

/// API 错误
#[derive(Serialize, ToSchema)]
pub struct ApiError {
    pub error: String,
}

// ────────────────────────────────────────────
// 路由构建
// ────────────────────────────────────────────

#[derive(Clone)]
pub struct ArticleRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

pub fn article_rest_router(
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
) -> axum::Router {
    let state = ArticleRouterState { resolver, pipeline };

    axum::Router::new()
        .route("/api/v1/articles", axum::routing::get(list_articles).post(create_article))
        .route("/api/v1/articles/{id}", axum::routing::get(get_article).put(update_article).delete(delete_article))
        .with_state(state)
}

// ────────────────────────────────────────────
// 辅助函数
// ────────────────────────────────────────────

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<ArticleServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel("svc-content")
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(ArticleServiceClient::new(channel))
}

fn extract_bearer(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

fn build_metadata(auth_header: Option<&str>) -> MetadataMap {
    let mut metadata = MetadataMap::new();
    if let Some(auth) = auth_header {
        if let Ok(val) = auth.parse() {
            metadata.insert("authorization", val);
        }
    }
    metadata
}

fn proto_to_article_dto(a: shared::proto::Article) -> ArticleDto {
    ArticleDto {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        content: a.content,
        author_id: a.author_id,
        tags: a.tags,
        view_count: a.view_count,
        like_count: a.like_count,
        status: a.status,
        created_at: a.created_at.map(|t| format!("{}",  t.seconds)),
        updated_at: a.updated_at.map(|t| format!("{}", t.seconds)),
        published_at: a.published_at.map(|t| format!("{}", t.seconds)),
        author: a.author.map(|u| super::super::routes::user::UserDto {
            id: u.id,
            username: u.username,
            email: u.email,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            bio: u.bio,
            created_at: u.created_at.map(|t| format!("{}", t.seconds)),
            updated_at: u.updated_at.map(|t| format!("{}", t.seconds)),
            company: u.company,
            location: u.location,
            website: u.website,
            social_links: u.social_links.into_iter().map(|l| super::super::routes::user::SocialLinkDto { platform: l.platform, url: l.url }).collect(),
        }),
    }
}

// ────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────

/// 获取文章详情
#[utoipa::path(
    get,
    path = "/api/v1/articles/{id}",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 200, description = "文章详情", body = GetArticleDto),
        (status = 404, description = "文章未找到", body = ApiError),
    ),
    tag = "文章"
)]
pub async fn get_article(
    State(state): State<ArticleRouterState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    info!(article_id = %id, "REST: GetArticle");

    let mut ctx = RpcContext::new("article", "get_article");
    let metadata = MetadataMap::new();
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            match client.get_article(GetArticleRequest { article_id: id }).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    Json(serde_json::json!({"article": article})).into_response()
                }
                Err(e) => {
                    error!(error = %e, "GetArticle failed");
                    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 获取文章列表
#[utoipa::path(
    get,
    path = "/api/v1/articles",
    params(
        ("page_size" = Option<i32>, Query, description = "每页大小"),
        ("page_token" = Option<String>, Query, description = "分页游标"),
        ("author_id" = Option<String>, Query, description = "按作者筛选"),
        ("query" = Option<String>, Query, description = "标题搜索"),
        ("tag" = Option<String>, Query, description = "按标签筛选"),
    ),
    responses(
        (status = 200, description = "文章列表", body = ListArticlesDto),
    ),
    tag = "文章"
)]
pub async fn list_articles(
    State(state): State<ArticleRouterState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<ListArticlesQuery>,
) -> impl IntoResponse {
    info!("REST: ListArticles");

    // 公开方法也过拦截器管道（日志 + 可选认证解析 user_id）
    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("article", "list_articles");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let req = ListArticlesRequest {
                pagination: Some(shared::proto::PaginationRequest {
                    page_size: params.page_size.unwrap_or(20),
                    page_token: params.page_token.unwrap_or_default(),
                }),
                author_id: params.author_id.unwrap_or_default(),
                query: params.query.unwrap_or_default(),
                tag: params.tag.unwrap_or_default(),
                categories: params.categories.unwrap_or_default(),
            };

            // 如果认证成功，将 user_id 传给下游（可选，用于草稿可见性）
            let mut grpc_req = tonic::Request::new(req);
            if let Some(user_id) = ctx.attrs.get("user_id") {
                if let Ok(val) = user_id.parse() {
                    grpc_req.metadata_mut().insert("x-user-id", val);
                }
            }

            match client.list_articles(grpc_req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let pagination = inner.pagination.unwrap_or_default();
                    let articles: Vec<_> = inner.articles.into_iter().map(proto_to_article_dto).collect();
                    Json(serde_json::json!({
                        "articles": articles,
                        "next_page_token": pagination.next_page_token,
                        "total_count": pagination.total_count,
                    })).into_response()
                }
                Err(e) => {
                    error!(error = %e, "ListArticles failed");
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 创建文章
#[utoipa::path(
    post,
    path = "/api/v1/articles",
    request_body = CreateArticleDto,
    responses(
        (status = 201, description = "文章创建成功", body = GetArticleDto),
        (status = 401, description = "未认证", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "文章"
)]
pub async fn create_article(
    State(state): State<ArticleRouterState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<CreateArticleDto>,
) -> impl IntoResponse {
    info!("REST: CreateArticle");

    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "create_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(CreateArticleRequest {
                title: body.title,
                content: body.content,
                summary: body.summary.unwrap_or_default(),
                tags: body.tags.unwrap_or_default(),
                status: body.status.unwrap_or(1),
                categories: body.categories.unwrap_or_default(),
            });
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }

            match client.create_article(req).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    (StatusCode::CREATED, Json(serde_json::json!({"article": article}))).into_response()
                }
                Err(e) => {
                    error!(error = %e, "CreateArticle failed");
                    (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 更新文章
#[utoipa::path(
    put,
    path = "/api/v1/articles/{id}",
    params(("id" = String, Path, description = "文章 ID")),
    request_body = UpdateArticleDto,
    responses(
        (status = 200, description = "文章更新成功", body = GetArticleDto),
        (status = 401, description = "未认证", body = ApiError),
        (status = 403, description = "无权限", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "文章"
)]
pub async fn update_article(
    State(state): State<ArticleRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
    Json(body): Json<UpdateArticleDto>,
) -> impl IntoResponse {
    info!(article_id = %id, "REST: UpdateArticle");

    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "update_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(UpdateArticleRequest {
                article_id: id,
                title: body.title.unwrap_or_default(),
                content: body.content.unwrap_or_default(),
                summary: body.summary.unwrap_or_default(),
                tags: body.tags.unwrap_or_default(),
                status: body.status.unwrap_or(0),
                categories: body.categories.unwrap_or_default(),
            });
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }

            match client.update_article(req).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    Json(serde_json::json!({"article": article})).into_response()
                }
                Err(e) => {
                    let code = match e.code() {
                        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
                        tonic::Code::NotFound => StatusCode::NOT_FOUND,
                        _ => StatusCode::BAD_REQUEST,
                    };
                    (code, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}

/// 删除文章
#[utoipa::path(
    delete,
    path = "/api/v1/articles/{id}",
    params(("id" = String, Path, description = "文章 ID")),
    responses(
        (status = 204, description = "文章删除成功"),
        (status = 401, description = "未认证", body = ApiError),
        (status = 403, description = "无权限", body = ApiError),
    ),
    security(("bearer_auth" = [])),
    tag = "文章"
)]
pub async fn delete_article(
    State(state): State<ArticleRouterState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    info!(article_id = %id, "REST: DeleteArticle");

    let auth = extract_bearer(&headers);
    let metadata = build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "delete_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e.message()}))).into_response();
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))).into_response(),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(DeleteArticleRequest { article_id: id });
            if let Ok(val) = user_id.parse() {
                req.metadata_mut().insert("x-user-id", val);
            }

            match client.delete_article(req).await {
                Ok(_) => StatusCode::NO_CONTENT.into_response(),
                Err(e) => {
                    let code = match e.code() {
                        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
                        tonic::Code::NotFound => StatusCode::NOT_FOUND,
                        _ => StatusCode::BAD_REQUEST,
                    };
                    (code, Json(serde_json::json!({"error": e.message()}))).into_response()
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"error": "Service unavailable"}))).into_response(),
    }
}
