use std::env;

/// 应用配置，从环境变量加载
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// PostgreSQL 连接字符串
    pub database_url: String,
    /// Redis 连接字符串
    pub redis_url: String,
    /// Meilisearch URL
    pub meili_url: String,
    /// Meilisearch Master Key
    pub meili_master_key: String,
    /// Gateway HTTP 端口
    pub gateway_port: u16,
    /// svc-user gRPC 端口
    pub svc_user_port: u16,
}

impl AppConfig {
    /// 从环境变量加载配置（自动加载 .env 文件）
    pub fn from_env() -> Result<Self, ConfigError> {
        // 尝试加载 .env，不存在也没关系
        dotenvy::dotenv().ok();

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .map_err(|_| ConfigError::Missing("DATABASE_URL"))?,
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            meili_url: env::var("MEILI_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:7700".to_string()),
            meili_master_key: env::var("MEILI_MASTER_KEY")
                .unwrap_or_default(),
            gateway_port: env::var("GATEWAY_PORT")
                .unwrap_or_else(|_| "8000".to_string())
                .parse()
                .map_err(|_| ConfigError::InvalidPort("GATEWAY_PORT"))?,
            svc_user_port: env::var("SVC_USER_PORT")
                .unwrap_or_else(|_| "50051".to_string())
                .parse()
                .map_err(|_| ConfigError::InvalidPort("SVC_USER_PORT"))?,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing required environment variable: {0}")]
    Missing(&'static str),
    #[error("Invalid port value for {0}")]
    InvalidPort(&'static str),
}
