mod config;
mod error;
mod handlers;
mod indexer;
mod services;
mod worker;

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::signal;
use tonic::transport::Server;
use tracing::{info, warn};

use shared::database::{self, DatabaseConfig};
use shared::discovery::{ConsulClient, ServiceRegistration};
use shared::proto::notification_service_server::NotificationServiceServer;

use crate::config::SvcNotificationConfig;
use crate::services::notification::NotificationServiceImpl;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "svc_notification=info,tower_http=info".parse().unwrap()),
        )
        .init();

    let config = SvcNotificationConfig::from_env();
    shared::net::kill_port_holder(config.port);

    // ── 数据库连接池 ──
    let db: Option<Arc<DatabaseConnection>> =
        match database::connect(&DatabaseConfig::from_env()).await {
            Ok(conn) => {
                info!("Database connection pool established");
                Some(Arc::new(conn))
            }
            Err(e) => {
                warn!(error = %e, "Database connection failed");
                None
            }
        };

    // ── Redis 连接池 ──
    let redis: Option<Arc<shared::redis::RedisPool>> =
        match shared::redis::RedisPool::new(&config.redis_url) {
            Ok(pool) => {
                info!("Redis connection pool established");
                Some(Arc::new(pool))
            }
            Err(e) => {
                warn!(error = %e, "Redis pool creation failed");
                None
            }
        };

    // ── NATS 连接 ──
    let nats: Option<Arc<shared::messaging::NatsClient>> =
        match shared::messaging::NatsClient::connect(&config.nats_url).await
        {
            Ok(client) => {
                info!("Connected to NATS");
                Some(Arc::new(client))
            }
            Err(e) => {
                warn!(error = %e, "NATS connection failed");
                None
            }
        };

    // ── NATS 事件消费者（后台任务）──
    if let (Some(nats_ref), Some(db_ref), Some(redis_ref)) =
        (nats.as_ref(), db.as_ref(), redis.as_ref())
    {
        worker::start_event_consumer(nats_ref.clone(), db_ref.clone(), redis_ref.clone()).await;
    } else {
        warn!("NATS event consumer not started (missing NATS/DB/Redis)");
    }

    // ── Meilisearch 索引同步（后台任务）──
    if let Some(nats_ref) = nats.as_ref() {
        indexer::start_indexer(nats_ref.clone(), db.clone(), &config.meili_url, &config.meili_key).await;
    }

    // ── Consul 注册 ──
    let consul = ConsulClient::new(&config.consul_url);
    let registration = ServiceRegistration::grpc(
        shared::constants::SVC_NOTIFICATION,
        &config.bind_address,
        config.port,
        &config.consul_url,
    )
    .await;
    let service_id = registration.id.clone();

    match consul.register(&registration).await {
        Ok(()) => info!("Registered with Consul as '{}'", service_id),
        Err(e) => warn!(error = %e, "Consul registration failed"),
    }

    // ── gRPC 服务 ──
    let addr = format!("0.0.0.0:{}", config.port).parse()?;
    let notification_service = NotificationServiceImpl::new(db, redis);

    let (health_reporter, health_service) = tonic_health::server::health_reporter();
    health_reporter
        .set_serving::<NotificationServiceServer<NotificationServiceImpl>>()
        .await;

    info!(%addr, "svc-notification gRPC server starting");

    let shutdown_consul = consul.clone();
    let shutdown_id = service_id.clone();

    Server::builder()
        .add_service(health_service)
        .add_service(NotificationServiceServer::new(notification_service))
        .serve_with_shutdown(addr, async move {
            shutdown_signal().await;
            info!("Shutdown signal received, deregistering from Consul...");
            if let Err(e) = shutdown_consul.deregister(&shutdown_id).await {
                warn!(error = %e, "Failed to deregister from Consul");
            } else {
                info!("Deregistered from Consul, bye!");
            }
        })
        .await?;

    Ok(())
}

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
