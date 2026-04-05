//! JWT 认证模块
//!
//! 提供 JWT token 的签发和验证，供 Gateway（验证）和微服务（签发）共用。

use jsonwebtoken::{DecodingKey, EncodingKey, Header, TokenData, Validation, decode, encode};
use serde::{Deserialize, Serialize};

/// JWT Claims
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject — 用户 ID
    pub sub: String,
    /// Expiration time (Unix timestamp)
    pub exp: usize,
    /// Issued at (Unix timestamp)
    pub iat: usize,
}

/// 认证配置
pub struct AuthConfig {
    /// JWT 签名密钥
    pub secret: String,
    /// Token 过期时间（小时）
    pub expiry_hours: u64,
}

impl AuthConfig {
    /// 从环境变量加载配置
    ///
    /// - `JWT_SECRET`：签名密钥（必须设置，无默认值）
    /// - `JWT_EXPIRY_HOURS`：过期时间，默认 168 小时（7 天）
    pub fn from_env() -> Self {
        let secret = std::env::var("JWT_SECRET")
            .expect("JWT_SECRET must be set — refusing to start with default secret");

        let expiry_hours = std::env::var("JWT_EXPIRY_HOURS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(168);

        Self {
            secret,
            expiry_hours,
        }
    }
}

/// 签发 JWT token
///
/// 生成包含 user_id 的 HS256 JWT token。
pub fn create_token(user_id: &str, config: &AuthConfig) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let exp = now + (config.expiry_hours as usize * 3600);

    let claims = Claims {
        sub: user_id.to_string(),
        exp,
        iat: now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.secret.as_bytes()),
    )
}

/// 验证 JWT token
///
/// 验证签名和过期时间，返回 Claims。
pub fn verify_token(token: &str, config: &AuthConfig) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.secret.as_bytes()),
        &Validation::default(),
    )
}
