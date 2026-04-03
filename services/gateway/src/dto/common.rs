//! 公共 DTO 和工具函数

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 统一 API 错误响应
///
/// 所有 REST 端点的错误均使用此格式。
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    /// 错误码（如 "NOT_FOUND"、"UNAUTHENTICATED"）
    pub code: String,
    /// 人类可读的错误描述
    pub message: String,
}

impl ApiError {
    /// 从 tonic::Status 构造 ApiError
    pub fn from_status(status: &tonic::Status) -> Self {
        let code = match status.code() {
            tonic::Code::NotFound => "NOT_FOUND",
            tonic::Code::Unavailable => "UNAVAILABLE",
            tonic::Code::InvalidArgument => "INVALID_ARGUMENT",
            tonic::Code::Unauthenticated => "UNAUTHENTICATED",
            tonic::Code::PermissionDenied => "PERMISSION_DENIED",
            tonic::Code::AlreadyExists => "ALREADY_EXISTS",
            tonic::Code::DeadlineExceeded => "DEADLINE_EXCEEDED",
            tonic::Code::ResourceExhausted => "RESOURCE_EXHAUSTED",
            _ => "INTERNAL",
        };
        Self {
            code: code.to_string(),
            message: status.message().to_string(),
        }
    }
}

/// 分页查询参数（通用）
#[derive(Deserialize, ToSchema)]
pub struct PaginationQuery {
    /// 每页大小
    pub page_size: Option<i32>,
    /// 分页游标
    pub page_token: Option<String>,
}

/// prost Timestamp → 字符串（秒级 Unix 时间戳）
pub fn timestamp_to_string(ts: &prost_types::Timestamp) -> String {
    let secs = ts.seconds;
    let nanos = ts.nanos;
    format!("{secs}.{nanos:09}")
}

/// tonic::Status → HTTP Response（统一映射）
pub fn status_to_response(status: tonic::Status) -> axum::response::Response {
    let http_status = match status.code() {
        tonic::Code::NotFound => StatusCode::NOT_FOUND,
        tonic::Code::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
        tonic::Code::InvalidArgument => StatusCode::BAD_REQUEST,
        tonic::Code::Unauthenticated => StatusCode::UNAUTHORIZED,
        tonic::Code::PermissionDenied => StatusCode::FORBIDDEN,
        tonic::Code::AlreadyExists => StatusCode::CONFLICT,
        tonic::Code::DeadlineExceeded => StatusCode::GATEWAY_TIMEOUT,
        tonic::Code::ResourceExhausted => StatusCode::TOO_MANY_REQUESTS,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };
    let api_error = ApiError::from_status(&status);
    (http_status, Json(api_error)).into_response()
}
