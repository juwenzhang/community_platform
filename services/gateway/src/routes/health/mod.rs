use axum::{Json, Router, routing::get};
use serde::{Deserialize, Serialize};
use tracing::info;
use utoipa::ToSchema;

/// 健康检查响应中的请求上下文
#[derive(Serialize, Deserialize, ToSchema)]
pub struct RequestData {
    pub request_origin: String,
    pub request_referrer: String,
    pub request_user_agent: String,
}

/// 健康检查响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    /// 服务状态
    pub status: String,
    /// 版本号
    pub version: String,
    /// Unix 时间戳
    pub timestamp: u64,
    /// 服务名
    pub service: String,
    /// 请求上下文
    pub data: RequestData,
}

/// 健康检查
///
/// 返回 Gateway 服务状态和基本信息。
#[utoipa::path(
    get,
    path = "/health",
    tag = "系统",
    responses(
        (status = 200, description = "服务正常", body = HealthResponse)
    )
)]
pub async fn health_handler(headers: axum::http::HeaderMap) -> Json<HealthResponse> {
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

    Json(HealthResponse {
        status: "ok".to_string(),
        version: "1.0.0".to_string(),
        timestamp,
        service: "gateway".to_string(),
        data: RequestData {
            request_origin: get_header("origin"),
            request_referrer: get_header("referer"),
            request_user_agent: get_header("user-agent"),
        },
    })
}

/// 构建 REST 路由
pub fn rest_router() -> Router {
    Router::new()
        .route("/", get(health_handler))
        .route("/health", get(health_handler))
}
