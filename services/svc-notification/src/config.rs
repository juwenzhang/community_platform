/// svc-notification 配置
pub struct SvcNotificationConfig {
    pub port: u16,
    pub consul_url: String,
    pub bind_address: String,
    pub redis_url: String,
    pub nats_url: String,
    pub meili_url: String,
    pub meili_key: String,
}

impl SvcNotificationConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let shared = shared::config::SharedConfig::from_env();
        let svc = shared::config::ServiceConfig::from_env(
            "SVC_NOTIFICATION_PORT",
            50053,
            "SVC_NOTIFICATION_BIND_ADDRESS",
        );

        Self {
            port: svc.port,
            consul_url: shared.consul_url,
            bind_address: svc.bind_address,
            redis_url: shared.redis_url,
            nats_url: shared.nats_url,
            meili_url: std::env::var("MEILI_URL")
                .unwrap_or_else(|_| "http://localhost:7700".to_string()),
            meili_key: std::env::var("MEILI_MASTER_KEY").unwrap_or_default(),
        }
    }
}
