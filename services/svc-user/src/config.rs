/// svc-user 配置
pub struct SvcUserConfig {
    pub port: u16,
    pub consul_url: String,
    pub bind_address: String,
}

impl SvcUserConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let shared = shared::config::SharedConfig::from_env();
        let svc = shared::config::ServiceConfig::from_env("SVC_USER_PORT", 50051, "SVC_USER_BIND_ADDRESS");

        Self {
            port: svc.port,
            consul_url: shared.consul_url,
            bind_address: svc.bind_address,
        }
    }
}
