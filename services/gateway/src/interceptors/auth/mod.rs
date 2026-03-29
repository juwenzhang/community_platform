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
    ("article", "get_article"),
    ("article", "list_articles"),
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
        let is_public = Self::is_public(&ctx.service, &ctx.method);

        // 提取 Authorization header（公开方法可选，非公开方法必须）
        let token = metadata
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "));

        match token {
            Some(token) => {
                // 验证 JWT
                match auth::verify_token(token, &self.auth_config) {
                    Ok(token_data) => {
                        ctx.attrs
                            .insert("user_id".to_string(), token_data.claims.sub.clone());
                        debug!(
                            service = %ctx.service,
                            method = %ctx.method,
                            user_id = %token_data.claims.sub,
                            "Auth passed"
                        );
                    }
                    Err(e) => {
                        if is_public {
                            // 公开方法：token 无效就忽略，当作匿名访问
                            debug!(
                                service = %ctx.service,
                                method = %ctx.method,
                                "Public method with invalid token, treating as anonymous"
                            );
                        } else {
                            // 非公开方法：token 无效就拒绝
                            warn!(
                                service = %ctx.service,
                                method = %ctx.method,
                                error = %e,
                                "Invalid or expired token"
                            );
                            return Err(Status::unauthenticated("Invalid or expired token"));
                        }
                    }
                }
            }
            None => {
                if is_public {
                    // 公开方法：无 token 正常放行
                    debug!(
                        service = %ctx.service,
                        method = %ctx.method,
                        "Public method, no token, anonymous access"
                    );
                } else {
                    // 非公开方法：无 token 拒绝
                    warn!(
                        service = %ctx.service,
                        method = %ctx.method,
                        "Missing authorization token"
                    );
                    return Err(Status::unauthenticated("Missing authorization token"));
                }
            }
        }

        Ok(())
    }
}
