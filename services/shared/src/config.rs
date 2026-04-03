use std::env;

/// 通用基础配置，从环境变量加载
///
/// 所有微服务共享的配置项（数据库、Consul、NATS 等）。
/// 各微服务的 config.rs 可通过 `SharedConfig::from_env()` 获取这些通用项。
#[derive(Debug, Clone)]
pub struct SharedConfig {
    /// PostgreSQL 连接字符串（必须设置）
    pub database_url: String,
    /// Redis 连接字符串
    pub redis_url: String,
    /// Consul 地址
    pub consul_url: String,
    /// NATS 地址
    pub nats_url: String,
}

impl SharedConfig {
    /// 从环境变量加载通用配置（自动加载 .env 文件）
    pub fn from_env() -> Self {
        // 尝试加载 .env，不存在也没关系
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            consul_url: env::var("CONSUL_URL")
                .unwrap_or_else(|_| "http://localhost:8500".to_string()),
            nats_url: env::var("NATS_URL")
                .unwrap_or_else(|_| "nats://localhost:4222".to_string()),
        }
    }
}

/// 微服务配置（端口 + 绑定地址）
///
/// 各微服务通过对应的环境变量加载自己的端口和绑定地址。
#[derive(Debug, Clone)]
pub struct ServiceConfig {
    pub port: u16,
    pub bind_address: String,
}

impl ServiceConfig {
    /// 从环境变量加载（port_env_key 如 "SVC_USER_PORT"，bind_env_key 如 "SVC_USER_BIND_ADDRESS"）
    pub fn from_env(port_env_key: &str, default_port: u16, bind_env_key: &str) -> Self {
        let port = env::var(port_env_key)
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(default_port);

        let bind_address = env::var(bind_env_key)
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        Self { port, bind_address }
    }
}
