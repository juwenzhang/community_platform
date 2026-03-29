//! 认证拦截器
//!
//! 从 gRPC metadata 提取 JWT token，验证签名和过期时间，
//! 将 user_id 注入到 RpcContext.attrs 中。
//! 公开方法（白名单）跳过认证。

use shared::auth::{self, AuthConfig};
use tonic::Status;
use tonic::metadata::MetadataMap;
use tracing::{debug, warn};

use crate::interceptors::{PreInterceptor, RpcContext};

/// 不需要认证的公开方法
const PUBLIC_METHODS: &[(&str, &str)] = &[
    ("user", "register"),
    ("user", "login"),
    ("user", "get_user"),
    ("user", "get_user_by_username"),
    ("user", "list_users"),
];

/// JWT 认证拦截器
pub struct AuthInterceptor {
    auth_config: AuthConfig,
}

impl AuthInterceptor {
    pub fn new() -> Self {
        Self {
            auth_config: AuthConfig::from_env(),
        }
    }

    /// 判断方法是否在公开白名单中
    fn is_public(service: &str, method: &str) -> bool {
        PUBLIC_METHODS.iter().any(|(s, m)| *s == service && *m == method)
    }
}

#[tonic::async_trait]
impl PreInterceptor for AuthInterceptor {
    async fn intercept(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status> {
        // 公开方法跳过认证
        if Self::is_public(&ctx.service, &ctx.method) {
            debug!(
                service = %ctx.service,
                method = %ctx.method,
                "Public method, skipping auth"
            );
            return Ok(());
        }

        // 提取 Authorization header
        let token = metadata
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or_else(|| {
                warn!(
                    service = %ctx.service,
                    method = %ctx.method,
                    "Missing authorization token"
                );
                Status::unauthenticated("Missing authorization token")
            })?;

        // 验证 JWT
        let token_data = auth::verify_token(token, &self.auth_config).map_err(|e| {
            warn!(
                service = %ctx.service,
                method = %ctx.method,
                error = %e,
                "Invalid or expired token"
            );
            Status::unauthenticated("Invalid or expired token")
        })?;

        // 注入 user_id 到上下文
        ctx.attrs
            .insert("user_id".to_string(), token_data.claims.sub.clone());

        debug!(
            service = %ctx.service,
            method = %ctx.method,
            user_id = %token_data.claims.sub,
            "Auth passed"
        );

        Ok(())
    }
}
