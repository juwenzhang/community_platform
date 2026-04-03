//! gRPC 请求提取工具
//!
//! 从 tonic Request metadata 中提取认证信息和参数。

use tonic::{Request, Status};
use uuid::Uuid;

use crate::constants;

/// 从 gRPC 请求 metadata 中提取 user_id（必需，缺失则返回 Unauthenticated）
pub fn extract_user_id<T>(request: &Request<T>) -> Result<String, Status> {
    request
        .metadata()
        .get(constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing user_id in metadata"))
}

/// 从 gRPC 请求 metadata 中尝试提取 user_id（可选，缺失返回 None）
pub fn try_extract_user_id<T>(request: &Request<T>) -> Option<String> {
    request
        .metadata()
        .get(constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// 解析 UUID 字符串，失败返回 InvalidArgument
pub fn parse_uuid(id: &str) -> Result<Uuid, Status> {
    Uuid::parse_str(id)
        .map_err(|_| Status::invalid_argument(format!("Invalid UUID: {id}")))
}

/// 数据库不可用的标准 Status
pub fn db_unavailable() -> Status {
    Status::unavailable("Database service is not available")
}

/// 数据库错误转换（统一日志 + Status 转换）
pub fn db_error(e: sea_orm::DbErr) -> Status {
    tracing::error!(error = %e, "Database query failed");
    Status::internal("Database query failed")
}
