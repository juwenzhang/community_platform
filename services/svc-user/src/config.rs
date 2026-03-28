/// svc-user 配置
pub struct SvcUserConfig {
    pub port: u16,
    /// Consul 地址，如 "http://localhost:8500"
    pub consul_url: String,
    /// 服务绑定地址（用于 Consul 注册，让其他服务能找到自己）
    pub bind_address: String,
}

impl SvcUserConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let port = std::env::var("SVC_USER_PORT")
            .unwrap_or_else(|_| "50051".to_string())
            .parse::<u16>()
            .unwrap_or(50051);

        let consul_url = std::env::var("CONSUL_URL")
            .unwrap_or_else(|_| "http://localhost:8500".to_string());

        let bind_address = std::env::var("SVC_USER_BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        Self {
            port,
            consul_url,
            bind_address,
        }
    }
}
