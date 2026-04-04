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
    /// Cloudinary 配置（可选，缺失时上传签名端点返回 503）
    pub cloudinary: Option<CloudinaryConfig>,
    /// Meilisearch 配置
    pub meilisearch: MeilisearchConfig,
}

/// Cloudinary 配置
#[derive(Clone)]
pub struct CloudinaryConfig {
    pub cloud_name: String,
    pub api_key: String,
    pub api_secret: String,
}

/// Meilisearch 配置
#[derive(Clone)]
pub struct MeilisearchConfig {
    pub url: String,
    pub master_key: String,
}

impl GatewayConfig {
    /// 从环境变量加载配置（自动加载 docker/.env）
    pub fn from_env() -> Self {
        // 尝试从 docker/.env 加载环境变量（开发模式）
        // Gateway 通过 cargo run 启动时，CWD 通常在 services/ 下
        for path in &["../docker/.env", "docker/.env", ".env"] {
            if dotenvy::from_filename(path).is_ok() {
                tracing::debug!("Loaded env from {}", path);
                break;
            }
        }

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
        if let Ok(url) = std::env::var("SVC_CONTENT_URL") {
            fallback_urls.insert(shared::constants::SVC_CONTENT.to_string(), url);
        } else {
            fallback_urls.insert(
                shared::constants::SVC_CONTENT.to_string(),
                "http://127.0.0.1:50052".to_string(),
            );
        }
        if let Ok(url) = std::env::var("SVC_NOTIFICATION_URL") {
            fallback_urls.insert(shared::constants::SVC_NOTIFICATION.to_string(), url);
        } else {
            fallback_urls.insert(
                shared::constants::SVC_NOTIFICATION.to_string(),
                "http://127.0.0.1:50053".to_string(),
            );
        }

        // Cloudinary 配置（可选）
        let cloudinary = match (
            std::env::var("CLOUDINARY_CLOUD_NAME"),
            std::env::var("CLOUDINARY_API_KEY"),
            std::env::var("CLOUDINARY_API_SECRET"),
        ) {
            (Ok(cloud_name), Ok(api_key), Ok(api_secret))
                if !cloud_name.is_empty() && !api_key.is_empty() && !api_secret.is_empty() =>
            {
                tracing::info!("Cloudinary configured (cloud: {})", cloud_name);
                Some(CloudinaryConfig {
                    cloud_name,
                    api_key,
                    api_secret,
                })
            }
            _ => {
                tracing::warn!("Cloudinary not configured — upload sign endpoint will return 503");
                None
            }
        };

        let meilisearch = MeilisearchConfig {
            url: std::env::var("MEILI_URL")
                .unwrap_or_else(|_| "http://localhost:7700".to_string()),
            master_key: std::env::var("MEILI_MASTER_KEY")
                .unwrap_or_default(),
        };

        Self {
            port,
            consul_url,
            nats_url,
            fallback_urls,
            cloudinary,
            meilisearch,
        }
    }
}
