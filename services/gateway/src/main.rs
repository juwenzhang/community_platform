use axum::{Json, Router, routing::get};
use serde_json::{json, Value};
use tonic::{Request, Response, Status, service::Routes};
use tonic::service::LayerExt;
use tonic_web::GrpcWebLayer;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use shared::proto::GetUserRequest;
use shared::proto::GetUserResponse;
use shared::proto::user_service_client::UserServiceClient;
use shared::proto::user_service_server::{UserService, UserServiceServer};

// ─────────────────────────────────────────────
// GatewayUserService — BFF 层，代理转发到 svc-user
// ─────────────────────────────────────────────

/// Gateway 作为 BFF 层实现 UserService trait，
/// 内部通过 gRPC 客户端调用 svc-user 微服务。
#[derive(Debug, Clone)]
pub struct GatewayUserService {
    svc_user_url: String,
}

impl GatewayUserService {
    pub fn new(svc_user_url: String) -> Self {
        Self { svc_user_url }
    }
}

#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<GetUserResponse>, Status> {
        let req_inner = request.into_inner();
        info!(user_id = %req_inner.user_id, "Gateway: forwarding GetUser to svc-user");

        // 连接 svc-user gRPC 服务
        let mut client =
            UserServiceClient::connect(self.svc_user_url.clone())
                .await
                .map_err(|e| {
                    tracing::error!(error = %e, "Failed to connect to svc-user");
                    Status::unavailable(format!("svc-user is unavailable: {e}"))
                })?;

        // 转发请求
        let response = client
            .get_user(GetUserRequest {
                user_id: req_inner.user_id,
            })
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "gRPC call to svc-user failed");
                e
            })?;

        Ok(response)
    }
}

// ─────────────────────────────────────────────
// REST 端点
// ─────────────────────────────────────────────

/// GET /health — 健康检查（保留 REST 格式）
async fn health(headers: axum::http::HeaderMap) -> Json<Value> {
    info!("Health check");

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let get_header = |name: &str| -> String {
        headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown")
            .to_string()
    };

    Json(json!({
        "status": "ok",
        "version": "1.0.0",
        "timestamp": timestamp,
        "service": "gateway",
        "data": {
            "request_origin": get_header("origin"),
            "request_referrer": get_header("referer"),
            "request_user_agent": get_header("user-agent"),
        }
    }))
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化 tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gateway=info,tower_http=info".parse().unwrap()),
        )
        .init();

    let gateway_port = std::env::var("GATEWAY_PORT").unwrap_or_else(|_| "8000".to_string());
    let svc_user_url = std::env::var("SVC_USER_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:50051".to_string());

    // 启动前自动清理被占用的端口
    if let Ok(port) = gateway_port.parse::<u16>() {
        shared::net::kill_port_holder(port);
    }

    // ── gRPC 服务（带 gRPC-Web 支持）──
    let user_service = GatewayUserService::new(svc_user_url);
    let grpc_service = UserServiceServer::new(user_service);

    // 使用 tonic-web GrpcWebLayer 包装 gRPC 服务，使其支持 gRPC-Web 协议
    let grpc_web_service = GrpcWebLayer::new().named_layer(grpc_service);

    // 将 gRPC 服务转为 axum Router
    let grpc_router = Routes::new(grpc_web_service).into_axum_router();

    // ── REST 路由 ──
    let rest_router = Router::new()
        .route("/", get(health))
        .route("/health", get(health));

    // ── 合并路由：gRPC-Web + REST ──
    let app = grpc_router
        .merge(rest_router)
        .layer(
            // CORS 配置：允许 gRPC-Web 所需的 headers
            CorsLayer::new()
                .allow_origin(AllowOrigin::any())
                .allow_methods(AllowMethods::any())
                .allow_headers(AllowHeaders::any())
                .expose_headers(tower_http::cors::ExposeHeaders::list([
                    "grpc-status".parse().unwrap(),
                    "grpc-message".parse().unwrap(),
                    "grpc-encoding".parse().unwrap(),
                    "grpc-accept-encoding".parse().unwrap(),
                ]))
                .max_age(std::time::Duration::from_secs(86400)),
        )
        .layer(TraceLayer::new_for_http());

    let addr = format!("0.0.0.0:{gateway_port}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!(%addr, "Gateway starting (gRPC-Web + REST), access via http://localhost:{gateway_port}");

    axum::serve(listener, app).await?;

    Ok(())
}
