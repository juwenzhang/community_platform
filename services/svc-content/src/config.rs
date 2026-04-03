/// svc-content 配置
pub struct SvcContentConfig {
    pub port: u16,
    pub consul_url: String,
    pub bind_address: String,
}

impl SvcContentConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let shared = shared::config::SharedConfig::from_env();
        let svc = shared::config::ServiceConfig::from_env("SVC_CONTENT_PORT", 50052, "SVC_CONTENT_BIND_ADDRESS");

        Self {
            port: svc.port,
            consul_url: shared.consul_url,
            bind_address: svc.bind_address,
        }
    }
}
