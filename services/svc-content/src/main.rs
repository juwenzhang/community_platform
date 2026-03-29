mod config;
mod error;
mod handlers;
mod services;

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::signal;
use tonic::transport::Server;
use tracing::{info, warn};

use shared::database::{self, DatabaseConfig};
use shared::discovery::{ConsulClient, ServiceRegistration};
use shared::proto::article_service_server::ArticleServiceServer;

use crate::config::SvcContentConfig;
use crate::services::article::ArticleServiceImpl;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化 tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "svc_content=info,tower_http=info".parse().unwrap()),
        )
        .init();

    // 加载配置
    let config = SvcContentConfig::from_env();

    // 启动前自动清理被占用的端口
    shared::net::kill_port_holder(config.port);

    // ── 数据库连接池（graceful degradation：失败不阻止启动）──
    let db: Option<Arc<DatabaseConnection>> =
        match database::connect(&DatabaseConfig::from_env()).await {
            Ok(conn) => {
                info!("Database connection pool established");
                Some(Arc::new(conn))
            }
            Err(e) => {
                warn!(
                    error = %e,
                    "Database connection failed, running without database (queries will return UNAVAILABLE)"
                );
                None
            }
        };

    // ── Consul 注册（graceful degradation：失败不阻止启动）──
    let consul = ConsulClient::new(&config.consul_url);
    let registration = ServiceRegistration::grpc(
        "svc-content",
        &config.bind_address,
        config.port,
        &config.consul_url,
    )
    .await;
    let service_id = registration.id.clone();

    match consul.register(&registration).await {
        Ok(()) => info!("Registered with Consul as '{}'", service_id),
        Err(e) => warn!(
            error = %e,
            "Consul registration failed, running without service discovery"
        ),
    }

    // ── gRPC 服务 ──
    let addr = format!("0.0.0.0:{}", config.port).parse()?;
    let article_service = ArticleServiceImpl::new(db);

    // ── gRPC Health Checking Protocol（Consul 健康检查需要）──
    let (health_reporter, health_service) = tonic_health::server::health_reporter();
    health_reporter
        .set_serving::<ArticleServiceServer<ArticleServiceImpl>>()
        .await;

    info!(%addr, "svc-content gRPC server starting");

    // ── 优雅关闭：收到 SIGINT/SIGTERM 时先从 Consul 注销 ──
    let shutdown_consul = consul.clone();
    let shutdown_id = service_id.clone();

    Server::builder()
        .add_service(health_service)
        .add_service(ArticleServiceServer::new(article_service))
        .serve_with_shutdown(addr, async move {
            shutdown_signal().await;
            info!("Shutdown signal received, deregistering from Consul...");
            if let Err(e) = shutdown_consul.deregister(&shutdown_id).await {
                warn!(error = %e, "Failed to deregister from Consul during shutdown");
            } else {
                info!("Deregistered from Consul, bye!");
            }
        })
        .await?;

    Ok(())
}

/// 等待关闭信号（Ctrl+C 或 SIGTERM）
async fn shutdown_signal() {
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
