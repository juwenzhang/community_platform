//! 数据库连接池模块
//!
//! 封装 SeaORM 数据库连接，提供统一的配置和初始化。
//! 所有微服务通过此模块获取 `DatabaseConnection`。

use std::time::Duration;

use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use tracing::info;

/// 数据库配置
pub struct DatabaseConfig {
    /// PostgreSQL 连接 URL
    pub url: String,
    /// 最大连接数（默认 10）
    pub max_connections: u32,
    /// 连接超时（秒，默认 5）
    pub connect_timeout_secs: u64,
}

impl DatabaseConfig {
    /// 从环境变量加载配置
    ///
    /// - `DATABASE_URL`：PostgreSQL 连接字符串（必须）
    /// - `DB_MAX_CONNECTIONS`：最大连接数（默认 10）
    /// - `DB_CONNECT_TIMEOUT`：连接超时秒数（默认 5）
    pub fn from_env() -> Self {
        let url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set — refusing to start with default credentials");

        let max_connections = std::env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);

        let connect_timeout_secs = std::env::var("DB_CONNECT_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);

        Self {
            url,
            max_connections,
            connect_timeout_secs,
        }
    }
}

/// 初始化数据库连接池
///
/// 返回 `DatabaseConnection`，可被多个 handler 共享（内部已是连接池）。
pub async fn connect(config: &DatabaseConfig) -> Result<DatabaseConnection, DbErr> {
    let mut opt = ConnectOptions::new(&config.url);
    opt.max_connections(config.max_connections)
        .connect_timeout(Duration::from_secs(config.connect_timeout_secs))
        .sqlx_logging(true)
        .sqlx_logging_level(tracing::log::LevelFilter::Debug);

    info!(
        max_connections = config.max_connections,
        timeout_secs = config.connect_timeout_secs,
        "Connecting to database..."
    );

    let db = Database::connect(opt).await?;

    info!("Database connection pool established");
    Ok(db)
}
