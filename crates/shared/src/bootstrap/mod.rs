//! 微服务启动工具
//!
//! 提取所有微服务 main.rs 中重复的样板代码。

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tracing::{info, warn};

use crate::database::{self, DatabaseConfig};
use crate::messaging::NatsClient;
use crate::redis::RedisPool;

/// 微服务公共依赖集合
///
/// 每个微服务初始化时创建，包含 DB / Redis / NATS 连接。
/// 所有依赖采用 graceful degradation — 连接失败不阻止启动。
pub struct ServiceDeps {
    pub db: Option<Arc<DatabaseConnection>>,
    pub redis: Option<Arc<RedisPool>>,
    pub nats: Option<Arc<NatsClient>>,
}

impl ServiceDeps {
    /// 初始化所有公共依赖（graceful degradation）
    pub async fn init(redis_url: &str, nats_url: &str) -> Self {
        // DB
        let db: Option<Arc<DatabaseConnection>> =
            match database::connect(&DatabaseConfig::from_env()).await {
                Ok(conn) => {
                    info!("Database connection pool established");
                    Some(Arc::new(conn))
                }
                Err(e) => {
                    warn!(error = %e, "Database connection failed, running in degraded mode");
                    None
                }
            };

        // Redis
        let redis: Option<Arc<RedisPool>> = match RedisPool::new(redis_url) {
            Ok(pool) => {
                if pool.is_healthy().await {
                    info!("Redis connection pool established");
                } else {
                    warn!("Redis pool created but not healthy");
                }
                Some(Arc::new(pool))
            }
            Err(e) => {
                warn!(error = %e, "Redis pool creation failed, running without cache");
                None
            }
        };

        // NATS
        let nats: Option<Arc<NatsClient>> = match NatsClient::connect(nats_url).await {
            Ok(client) => {
                info!("Connected to NATS");
                Some(Arc::new(client))
            }
            Err(e) => {
                warn!(error = %e, "NATS connection failed, running without event publishing");
                None
            }
        };

        Self { db, redis, nats }
    }
}

/// 等待关闭信号（Ctrl+C 或 SIGTERM）
///
/// 所有微服务共用，不需要每个 main.rs 重复定义。
pub async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
