mod config;
mod interceptors;
mod middleware;
mod resolver;
mod routes;
mod services;
mod worker;

use std::sync::Arc;

use shared::discovery::ConsulClient;
use shared::messaging::NatsClient;
use shared::proto::user_service_server::UserServiceServer;
use shared::proto::article_service_server::ArticleServiceServer;
use shared::proto::comment_service_server::CommentServiceServer;
use shared::proto::social_service_server::SocialServiceServer;
use tonic::service::LayerExt;
use tonic::service::Routes;
use tonic_web::GrpcWebLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::GatewayConfig;
use crate::interceptors::InterceptorPipeline;
use crate::interceptors::auth::AuthInterceptor;
use crate::interceptors::log::LogInterceptor;
use crate::interceptors::retry::RetryInterceptor;
use crate::middleware::cors::cors_layer;
use crate::resolver::ServiceResolver;
use crate::routes::health;
use crate::routes::health::rest_router;
use crate::routes::user as user_routes;
use crate::routes::article as article_routes;
use crate::routes::comment as comment_routes;
use crate::routes::social as social_routes;
use crate::services::user::GatewayUserService;
use crate::services::article::GatewayArticleService;
use crate::services::comment::GatewayCommentService;
use crate::services::social::GatewaySocialService;
use crate::worker::retry_worker;

/// Gateway OpenAPI 文档
///
/// 类似 Python FastAPI 的自动文档生成：
/// - 访问 /swagger-ui/ 即可看到可视化的 API 文档
/// - 访问 /api-docs/openapi.json 获取 OpenAPI JSON spec
///
/// gRPC 服务通过 REST proxy 自动暴露为 JSON 端点，
/// 并集成到此文档中（与 FastAPI 体验一致）。
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Luhanxin Community Gateway",
        version = "0.1.0",
        description = "Gateway API 文档\n\n所有 gRPC 服务均通过 REST proxy 暴露为 JSON 端点，可在此直接测试。\n\n- gRPC 原生调用：使用 Connect Protocol (HTTP/2 + Protobuf)\n- REST JSON 调用：使用下方端点 (HTTP/1.1 + JSON)",
        contact(name = "luhanxin", email = "hi@luhanxin.com")
    ),
    paths(
        health::health_handler,
        user_routes::get_user,
        user_routes::get_user_by_username,
        user_routes::list_users,
        user_routes::register,
        user_routes::login,
        user_routes::get_current_user,
        user_routes::update_profile,
        article_routes::get_article,
        article_routes::list_articles,
        article_routes::create_article,
        article_routes::update_article,
        article_routes::delete_article,
        comment_routes::list_comments,
        comment_routes::create_comment,
        comment_routes::delete_comment,
        social_routes::like_article,
        social_routes::unlike_article,
        social_routes::favorite_article,
        social_routes::unfavorite_article,
        social_routes::get_interaction,
        social_routes::list_favorites,
    ),
    components(schemas(
        health::HealthResponse,
        health::RequestData,
        user_routes::UserDto,
        user_routes::GetUserDto,
        user_routes::AuthDto,
        user_routes::RegisterDto,
        user_routes::LoginDto,
        user_routes::UpdateProfileDto,
        user_routes::ListUsersDto,
        user_routes::ListUsersQuery,
        user_routes::ApiError,
        article_routes::ArticleDto,
        article_routes::GetArticleDto,
        article_routes::ListArticlesDto,
        article_routes::ListArticlesQuery,
        article_routes::CreateArticleDto,
        article_routes::UpdateArticleDto,
        comment_routes::CommentDto,
        comment_routes::CommentAuthorDto,
        comment_routes::ListCommentsDto,
        comment_routes::CreateCommentBody,
        social_routes::InteractionDto,
        social_routes::LikeResponseDto,
        social_routes::FavoriteResponseDto,
    )),
    tags(
        (name = "系统", description = "系统管理端点（健康检查、监控等）"),
        (name = "用户", description = "用户查询"),
        (name = "认证", description = "注册、登录、当前用户、资料更新"),
        (name = "文章", description = "文章 CRUD"),
        (name = "评论", description = "评论 CRUD（二级嵌套）"),
        (name = "社交", description = "点赞、收藏、互动状态")
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化 tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gateway=info,tower_http=info".parse().unwrap()),
        )
        .init();

    // 加载配置
    let config = GatewayConfig::from_env();

    // 启动前自动清理被占用的端口
    shared::net::kill_port_holder(config.port);

    // ── NATS 连接（graceful degradation：失败不阻止启动）──
    let nats: Option<Arc<NatsClient>> = match NatsClient::connect(&config.nats_url).await {
        Ok(client) => {
            info!("Connected to NATS at {}", config.nats_url);
            Some(Arc::new(client))
        }
        Err(e) => {
            warn!(
                error = %e,
                "NATS connection failed, running without async retry/events"
            );
            None
        }
    };

    // 启动重试 Worker（如果 NATS 可用）
    if let Some(ref nats_client) = nats {
        retry_worker::spawn_retry_worker(Arc::clone(nats_client));
    }

    // ── 服务解析器（Consul 动态路由 + 连接池）──
    let consul = ConsulClient::new(&config.consul_url);
    let resolver = Arc::new(ServiceResolver::new(consul, config.fallback_urls));
    resolver.start_watcher("svc-user");
    resolver.start_watcher("svc-content");

    // ── 拦截器管道（执行顺序：Log → Auth → 调用 → Log → Retry）──
    let pipeline = Arc::new(
        InterceptorPipeline::new()
            .add_pre(LogInterceptor)
            .add_pre(AuthInterceptor::new())
            .add_post(LogInterceptor)
            .add_post(RetryInterceptor::new(nats.clone())),
    );

    // ── gRPC 服务（带 gRPC-Web 支持）──
    let user_service = GatewayUserService::new(Arc::clone(&resolver), Arc::clone(&pipeline));
    let article_service = GatewayArticleService::new(Arc::clone(&resolver), Arc::clone(&pipeline));
    let comment_service = GatewayCommentService::new(Arc::clone(&resolver), Arc::clone(&pipeline));
    let social_service = GatewaySocialService::new(Arc::clone(&resolver), Arc::clone(&pipeline));

    let grpc_router = Routes::new(GrpcWebLayer::new().named_layer(UserServiceServer::new(user_service)))
        .add_service(GrpcWebLayer::new().named_layer(ArticleServiceServer::new(article_service)))
        .add_service(GrpcWebLayer::new().named_layer(CommentServiceServer::new(comment_service)))
        .add_service(GrpcWebLayer::new().named_layer(SocialServiceServer::new(social_service)))
        .into_axum_router();

    // ── Swagger UI（内嵌，类似 FastAPI 的 /docs）──
    let swagger_ui = SwaggerUi::new("/swagger-ui")
        .url("/api-docs/openapi.json", ApiDoc::openapi());

    // ── REST Proxy（gRPC → JSON，集成 Swagger + 拦截器）──
    let user_rest = user_routes::user_rest_router(Arc::clone(&resolver), Arc::clone(&pipeline));
    let article_rest = article_routes::article_rest_router(Arc::clone(&resolver), Arc::clone(&pipeline));
    let comment_rest = comment_routes::comment_rest_router(Arc::clone(&resolver), Arc::clone(&pipeline));
    let social_rest = social_routes::social_rest_router(Arc::clone(&resolver), Arc::clone(&pipeline));

    // ── 合并路由：gRPC-Web + REST proxy + REST health + Swagger UI ──
    let rest_and_swagger = rest_router()
        .merge(user_rest)
        .merge(article_rest)
        .merge(comment_rest)
        .merge(social_rest)
        .merge(swagger_ui);

    let app = grpc_router
        .merge(rest_and_swagger)
        .layer(cors_layer())
        .layer(TraceLayer::new_for_http());

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!(
        %addr,
        "Gateway starting (gRPC-Web + REST + Swagger UI)"
    );
    info!("API docs:  http://localhost:{}/swagger-ui/", config.port);
    info!("OpenAPI:   http://localhost:{}/api-docs/openapi.json", config.port);
    info!("Health:    http://localhost:{}/health", config.port);

    axum::serve(listener, app).await?;

    Ok(())
}
