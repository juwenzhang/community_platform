//! REST 路由公共辅助函数
//!
//! 从各路由模块提取的共享工具函数，消除跨模块重复代码。

use axum::http::HeaderMap;
use tonic::metadata::MetadataMap;

/// 从 HTTP Authorization header 提取完整的 auth value（含 Bearer 前缀）
pub fn extract_bearer(headers: &HeaderMap) -> Option<String> {
    headers
        .get(shared::constants::AUTH_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// 构建 gRPC MetadataMap（白名单策略：仅转发 authorization）
///
/// 用于 REST handler → gRPC 拦截器管道传递认证信息。
pub fn build_metadata(auth_header: Option<&str>) -> MetadataMap {
    let mut metadata = MetadataMap::new();
    if let Some(auth) = auth_header {
        if let Ok(val) = auth.parse() {
            metadata.insert(shared::constants::AUTH_HEADER, val);
        }
    }
    metadata
}

/// 将 x-user-id 注入到 gRPC request metadata 中
///
/// 从 `ctx.attrs["user_id"]` 读取认证用户 ID，设置到下游请求的 metadata。
pub fn inject_user_id_metadata<T>(
    req: &mut tonic::Request<T>,
    user_id: &str,
) {
    if let Ok(val) = user_id.parse() {
        req.metadata_mut()
            .insert(shared::constants::METADATA_USER_ID, val);
    }
}
