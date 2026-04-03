use std::collections::HashMap;

/// Gateway 配置
pub struct GatewayConfig {
    pub port: u16,
    /// Consul 地址
    pub consul_url: String,
    /// NATS 地址
    pub nats_url: String,
    /// Fallback 服务地址（Consul 不可达时使用）
    pub fallback_urls: HashMap<String, String>,
}

impl GatewayConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let port = std::env::var("GATEWAY_PORT")
            .unwrap_or_else(|_| "8000".to_string())
            .parse::<u16>()
            .unwrap_or(8000);

        let consul_url = std::env::var("CONSUL_URL")
            .unwrap_or_else(|_| "http://localhost:8500".to_string());

        let nats_url = std::env::var("NATS_URL")
            .unwrap_or_else(|_| "nats://localhost:4222".to_string());

        // Fallback URLs（环境变量格式：SVC_USER_URL, SVC_CONTENT_URL 等）
        let mut fallback_urls = HashMap::new();
        if let Ok(url) = std::env::var("SVC_USER_URL") {
            fallback_urls.insert(shared::constants::SVC_USER.to_string(), url);
        } else {
            fallback_urls.insert(
                shared::constants::SVC_USER.to_string(),
                "http://127.0.0.1:50051".to_string(),
            );
        }

        Self {
            port,
            consul_url,
            nats_url,
            fallback_urls,
        }
    }
}
