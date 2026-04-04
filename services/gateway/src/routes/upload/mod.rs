//! 上传签名端点 — Cloudinary Signed Upload
//!
//! POST /api/v1/upload/sign
//! 认证用户获取 Cloudinary 上传签名，前端直传 Cloudinary。

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use utoipa::ToSchema;

use crate::config::CloudinaryConfig;
use crate::routes::helpers::extract_bearer;
use shared::auth::{AuthConfig, verify_token};

/// 上传签名请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct SignRequest {
    /// 上传目标文件夹（如 "avatars"、"covers"）
    pub folder: String,
}

/// 上传签名响应
#[derive(Debug, Serialize, ToSchema)]
pub struct SignResponse {
    pub signature: String,
    pub timestamp: i64,
    pub cloud_name: String,
    pub api_key: String,
    pub folder: String,
}

/// 错误响应
#[derive(Debug, Serialize, ToSchema)]
pub struct UploadError {
    pub error: String,
}

/// 上传路由状态
#[derive(Clone)]
pub struct UploadState {
    pub cloudinary: Option<CloudinaryConfig>,
}

/// POST /api/v1/upload/sign — 获取 Cloudinary 上传签名
#[utoipa::path(
    post,
    path = "/api/v1/upload/sign",
    tag = "上传",
    request_body = SignRequest,
    responses(
        (status = 200, description = "签名成功", body = SignResponse),
        (status = 401, description = "未认证"),
        (status = 503, description = "Cloudinary 未配置"),
    ),
    security(("bearer" = []))
)]
pub async fn sign_upload(
    State(state): State<Arc<UploadState>>,
    headers: HeaderMap,
    Json(body): Json<SignRequest>,
) -> Result<Json<SignResponse>, (StatusCode, Json<UploadError>)> {
    // 1. 验证 JWT
    let auth_header = extract_bearer(&headers).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(UploadError {
                error: "Missing Authorization header".to_string(),
            }),
        )
    })?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .unwrap_or(&auth_header);

    let auth_config = AuthConfig::from_env();
    let token_data = verify_token(token, &auth_config).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(UploadError {
                error: "Invalid or expired token".to_string(),
            }),
        )
    })?;

    let user_id = &token_data.claims.sub;

    // 2. 检查 Cloudinary 配置
    let cloudinary = state.cloudinary.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(UploadError {
                error: "Cloudinary not configured".to_string(),
            }),
        )
    })?;

    // 3. 生成签名
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let folder = format!("{}/{}", body.folder, user_id);

    // Cloudinary 签名算法：SHA-1(params_to_sign + api_secret)
    // params_to_sign = "folder=xxx&timestamp=xxx"（按字母排序拼接）
    let params_to_sign = format!("folder={folder}&timestamp={timestamp}");
    let sign_input = format!("{}{}", params_to_sign, cloudinary.api_secret);

    let mut hasher = Sha1::new();
    hasher.update(sign_input.as_bytes());
    let signature = hex::encode(hasher.finalize());

    Ok(Json(SignResponse {
        signature,
        timestamp,
        cloud_name: cloudinary.cloud_name.clone(),
        api_key: cloudinary.api_key.clone(),
        folder,
    }))
}

/// 创建上传路由
pub fn upload_rest_router(cloudinary: Option<CloudinaryConfig>) -> Router {
    let state = Arc::new(UploadState { cloudinary });
    Router::new()
        .route("/api/v1/upload/sign", post(sign_upload))
        .with_state(state)
}
