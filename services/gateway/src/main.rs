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
use crate::services::user::GatewayUserService;
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
    ),
    components(schemas(
        health::HealthResponse,
        health::RequestData,
        user_routes::UserDto,
        user_routes::GetUserDto,
        user_routes::ApiError,
    )),
    tags(
        (name = "系统", description = "系统管理端点（健康检查、监控等）"),
        (name = "用户", description = "用户服务 — REST proxy for gRPC UserService")
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
    let grpc_service = UserServiceServer::new(user_service);
    let grpc_web_service = GrpcWebLayer::new().named_layer(grpc_service);
    let grpc_router = Routes::new(grpc_web_service).into_axum_router();

    // ── Swagger UI（内嵌，类似 FastAPI 的 /docs）──
    let swagger_ui = SwaggerUi::new("/swagger-ui")
        .url("/api-docs/openapi.json", ApiDoc::openapi());

    // ── REST Proxy（gRPC → JSON，集成 Swagger + 拦截器）──
    let user_rest = user_routes::user_rest_router(Arc::clone(&resolver), Arc::clone(&pipeline));

    // ── 合并路由：gRPC-Web + REST proxy + REST health + Swagger UI ──
    let rest_and_swagger = rest_router()
        .merge(user_rest)
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
