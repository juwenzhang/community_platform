//! 文章 REST Proxy

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use tracing::{error, info};

use shared::proto::article_service_client::ArticleServiceClient;
use shared::proto::{
    CreateArticleRequest, DeleteArticleRequest, GetArticleRequest, ListArticlesRequest,
    UpdateArticleRequest,
};

use crate::dto::common::status_to_response;
use crate::dto::article::{
    ArticleDto, CreateArticleDto, GetArticleDto, ListArticlesDto, ListArticlesQuery,
    UpdateArticleDto, proto_to_article_dto,
};
use crate::interceptors::{InterceptorPipeline, RpcContext};
use crate::resolver::ServiceResolver;

use super::helpers;

// Re-export for Swagger
pub use crate::dto::article::{
    ArticleDto as ArticleDtoSchema, GetArticleDto as GetArticleDtoSchema,
    ListArticlesDto as ListArticlesDtoSchema, ListArticlesQuery as ListArticlesQuerySchema,
    CreateArticleDto as CreateArticleDtoSchema, UpdateArticleDto as UpdateArticleDtoSchema,
};
pub use crate::dto::common::ApiError;

// ────────────────────────────────────────────
// 共享状态 + 辅助函数
// ────────────────────────────────────────────

#[derive(Clone)]
pub struct ArticleRouterState {
    resolver: Arc<ServiceResolver>,
    pipeline: Arc<InterceptorPipeline>,
}

async fn get_client(
    resolver: &ServiceResolver,
) -> Result<ArticleServiceClient<tonic::transport::Channel>, StatusCode> {
    let channel = resolver
        .get_channel(shared::constants::SVC_CONTENT)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(ArticleServiceClient::new(channel))
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
    let metadata = tonic::metadata::MetadataMap::new();
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            match client.get_article(GetArticleRequest { article_id: id }).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    let dto = GetArticleDto { article };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => {
                    error!(error = %e, "GetArticle failed");
                    status_to_response(e)
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());
    let mut ctx = RpcContext::new("article", "list_articles");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let req = ListArticlesRequest {
                pagination: Some(shared::proto::PaginationRequest {
                    page_size: params.page_size.unwrap_or(shared::constants::DEFAULT_PAGE_SIZE),
                    page_token: params.page_token.unwrap_or_default(),
                }),
                author_id: params.author_id.unwrap_or_default(),
                query: params.query.unwrap_or_default(),
                tag: params.tag.unwrap_or_default(),
                categories: params.categories.unwrap_or_default(),
                sort: params.sort.unwrap_or(0),
            };

            let mut grpc_req = tonic::Request::new(req);
            if let Some(user_id) = ctx.attrs.get("user_id") {
                helpers::inject_user_id_metadata(&mut grpc_req, user_id);
            }

            match client.list_articles(grpc_req).await {
                Ok(resp) => {
                    let inner = resp.into_inner();
                    let pagination = inner.pagination.unwrap_or_default();
                    let dto = ListArticlesDto {
                        articles: inner.articles.into_iter().map(proto_to_article_dto).collect(),
                        next_page_token: pagination.next_page_token,
                        total_count: pagination.total_count,
                    };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => {
                    error!(error = %e, "ListArticles failed");
                    status_to_response(e)
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "create_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
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
            helpers::inject_user_id_metadata(&mut req, &user_id);

            match client.create_article(req).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    let dto = GetArticleDto { article };
                    (StatusCode::CREATED, Json(serde_json::to_value(&dto).unwrap_or_default())).into_response()
                }
                Err(e) => {
                    error!(error = %e, "CreateArticle failed");
                    status_to_response(e)
                }
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "update_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
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
            helpers::inject_user_id_metadata(&mut req, &user_id);

            match client.update_article(req).await {
                Ok(resp) => {
                    let article = resp.into_inner().article.map(proto_to_article_dto);
                    let dto = GetArticleDto { article };
                    Json(serde_json::to_value(&dto).unwrap_or_default()).into_response()
                }
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
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

    let auth = helpers::extract_bearer(&headers);
    let metadata = helpers::build_metadata(auth.as_deref());

    let mut ctx = RpcContext::new("article", "delete_article");
    if let Err(e) = state.pipeline.run_pre(&mut ctx, &metadata).await {
        return status_to_response(e);
    }

    let user_id = match ctx.attrs.get("user_id") {
        Some(id) => id.clone(),
        None => return status_to_response(tonic::Status::unauthenticated("Unauthorized")),
    };

    match get_client(&state.resolver).await {
        Ok(mut client) => {
            let mut req = tonic::Request::new(DeleteArticleRequest { article_id: id });
            helpers::inject_user_id_metadata(&mut req, &user_id);

            match client.delete_article(req).await {
                Ok(_) => StatusCode::NO_CONTENT.into_response(),
                Err(e) => status_to_response(e),
            }
        }
        Err(code) => (code, Json(serde_json::json!({"code": "UNAVAILABLE", "message": "Service unavailable"}))).into_response(),
    }
}

// ────────────────────────────────────────────
// Router 构建
// ────────────────────────────────────────────

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
