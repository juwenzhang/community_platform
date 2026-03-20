use axum::{
    Router,
    Json,
    extract::State,
    routing::get,
    http::StatusCode,
};
use serde_json::{json, Value};
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};
use tracing::info;

use shared::proto::user_service_client::UserServiceClient;
use shared::proto::GetUserRequest;

/// 应用状态
#[derive(Clone)]
struct AppState {
    user_service_url: String,
}

/// GET /health — 健康检查
async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// GET /api/v1/users/:user_id — 代理转发到 svc-user
async fn get_user(
    State(state): State<AppState>,
    axum::extract::Path(user_id): axum::extract::Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let mut client = UserServiceClient::connect(state.user_service_url.clone())
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to connect to svc-user");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "service_unavailable",
                    "message": format!("User service is unavailable: {e}")
                })),
            )
        })?;

    let response = client
        .get_user(GetUserRequest {
            user_id: user_id.clone(),
        })
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "gRPC call failed");
            let (status, msg) = match e.code() {
                tonic::Code::NotFound => (StatusCode::NOT_FOUND, "User not found"),
                tonic::Code::InvalidArgument => (StatusCode::BAD_REQUEST, "Invalid argument"),
                _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            };
            (status, Json(json!({ "error": msg, "details": e.message() })))
        })?;

    let user = response
        .into_inner()
        .user
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "User not found" })),
            )
        })?;

    Ok(Json(json!({
        "user_id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
    })))
}

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

    let state = AppState {
        user_service_url: svc_user_url,
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/users/{user_id}", get(get_user))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("0.0.0.0:{gateway_port}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!(%addr, "Gateway HTTP server starting");

    axum::serve(listener, app).await?;

    Ok(())
}
