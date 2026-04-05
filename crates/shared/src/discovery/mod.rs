//! Consul 服务发现模块
//!
//! 封装 Consul HTTP API v1，提供服务注册、注销、健康实例查询和 Watch 能力。
//! 使用 `reqwest` 调用 HTTP API，不引入重量级 Consul SDK。

use serde::{Deserialize, Serialize};
use tracing::info;

/// Consul 客户端
#[derive(Debug, Clone)]
pub struct ConsulClient {
    base_url: String,
    http: reqwest::Client,
}

/// 服务注册信息
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ServiceRegistration {
    /// 服务名，如 "svc-user"
    pub name: String,
    /// 实例 ID，如 "svc-user-hostname-1"
    #[serde(rename = "ID")]
    pub id: String,
    /// 绑定地址
    pub address: String,
    /// 绑定端口
    pub port: u16,
    /// 标签，如 ["grpc", "v1"]
    pub tags: Vec<String>,
    /// 健康检查配置
    pub check: HealthCheck,
}

/// 健康检查配置
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct HealthCheck {
    /// gRPC 健康检查地址，如 "host.docker.internal:50051"
    #[serde(rename = "GRPC")]
    pub grpc: String,
    /// 检查间隔，如 "10s"
    pub interval: String,
    /// 超时，如 "5s"
    pub timeout: String,
    /// 注销超时（健康检查失败后多久自动注销），如 "30s"
    pub deregister_critical_service_after: String,
}

/// 服务实例信息（从 Consul 查询返回）
#[derive(Debug, Clone)]
pub struct ServiceInstance {
    /// 实例 ID
    pub id: String,
    /// 服务名
    pub name: String,
    /// 地址
    pub address: String,
    /// 端口
    pub port: u16,
}

/// Watch 查询结果
#[derive(Debug)]
pub struct WatchResult {
    /// 健康的服务实例列表
    pub instances: Vec<ServiceInstance>,
    /// Consul 索引（下次 Watch 传入）
    pub index: u64,
}

/// Consul API 返回的健康检查服务条目
#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct HealthServiceEntry {
    service: ServiceEntry,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ServiceEntry {
    #[serde(rename = "ID")]
    id: String,
    service: String,
    address: String,
    port: u16,
}

/// Consul 客户端错误
#[derive(Debug, thiserror::Error)]
pub enum ConsulError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Consul returned error status {status}: {body}")]
    Api { status: u16, body: String },

    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

impl ConsulClient {
    /// 创建 Consul 客户端
    ///
    /// `base_url` 如 "http://localhost:8500"
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            http: reqwest::Client::new(),
        }
    }

    /// 注册服务实例
    ///
    /// 调用 PUT /v1/agent/service/register
    pub async fn register(&self, reg: &ServiceRegistration) -> Result<(), ConsulError> {
        let url = format!("{}/v1/agent/service/register", self.base_url);

        let resp = self.http.put(&url).json(reg).send().await?;

        if resp.status().is_success() {
            info!(
                service = %reg.name,
                id = %reg.id,
                address = %reg.address,
                port = %reg.port,
                "Registered service with Consul"
            );
            Ok(())
        } else {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            Err(ConsulError::Api { status, body })
        }
    }

    /// 注销服务实例
    ///
    /// 调用 PUT /v1/agent/service/deregister/:id
    pub async fn deregister(&self, service_id: &str) -> Result<(), ConsulError> {
        let url = format!(
            "{}/v1/agent/service/deregister/{}",
            self.base_url, service_id
        );

        let resp = self.http.put(&url).send().await?;

        if resp.status().is_success() {
            info!(id = %service_id, "Deregistered service from Consul");
            Ok(())
        } else {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            Err(ConsulError::Api { status, body })
        }
    }

    /// 查询健康的服务实例
    ///
    /// 调用 GET /v1/health/service/:name?passing=true
    pub async fn healthy_instances(
        &self,
        service_name: &str,
    ) -> Result<Vec<ServiceInstance>, ConsulError> {
        let url = format!(
            "{}/v1/health/service/{}?passing=true",
            self.base_url, service_name
        );

        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::Api { status, body });
        }

        let entries: Vec<HealthServiceEntry> = resp.json().await?;

        let instances = entries
            .into_iter()
            .map(|entry| {
                let svc = entry.service;
                ServiceInstance {
                    id: svc.id,
                    name: svc.service,
                    address: svc.address,
                    port: svc.port,
                }
            })
            .collect();

        Ok(instances)
    }

    /// Watch 服务变化（Consul Blocking Query / 长轮询）
    ///
    /// 传入上次的 `index`（首次传 0），当服务实例列表发生变化或超时（30s）时返回。
    /// 返回新的实例列表和新的 index。
    ///
    /// 调用 GET /v1/health/service/:name?passing=true&index=N&wait=30s
    pub async fn watch(
        &self,
        service_name: &str,
        index: u64,
    ) -> Result<WatchResult, ConsulError> {
        let url = format!(
            "{}/v1/health/service/{}?passing=true&index={}&wait=30s",
            self.base_url, service_name, index
        );

        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::Api { status, body });
        }

        // 从响应头提取 X-Consul-Index
        let new_index = resp
            .headers()
            .get("x-consul-index")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(index);

        let entries: Vec<HealthServiceEntry> = resp.json().await?;

        let instances = entries
            .into_iter()
            .map(|entry| {
                let svc = entry.service;
                ServiceInstance {
                    id: svc.id,
                    name: svc.service,
                    address: svc.address,
                    port: svc.port,
                }
            })
            .collect();

        Ok(WatchResult {
            instances,
            index: new_index,
        })
    }
}

impl ServiceInstance {
    /// 返回 "http://address:port" 格式的 URL（用于 gRPC Channel 连接）
    pub fn url(&self) -> String {
        format!("http://{}:{}", self.address, self.port)
    }
}

impl ServiceRegistration {
    /// 创建一个 gRPC 服务的注册信息
    ///
    /// `address` 是服务绑定地址（其他服务连你用的，如 `127.0.0.1`）。
    /// `consul_url` 用于探测 Consul 是否跑在 Docker 容器内。
    ///
    /// 健康检查地址自动适配（Consul 容器需要能访问到宿主机服务）：
    /// 1. 环境变量 `CONSUL_CHECK_HOST` 优先（用户显式指定）
    /// 2. 自动探测：查询 Consul `/v1/agent/self`，判断 NodeName 是否为容器 ID
    /// 3. 兜底：使用传入的 `address`（Consul 在本地 / K8s Pod 网络）
    pub async fn grpc(name: &str, address: &str, port: u16, consul_url: &str) -> Self {
        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let check_host = resolve_check_host(address, consul_url).await;

        tracing::info!(
            service = %name,
            check_host = %check_host,
            address = %address,
            "Consul health check host resolved"
        );

        Self {
            name: name.to_string(),
            id: format!("{name}-{hostname}-{port}"),
            address: address.to_string(),
            port,
            tags: vec!["grpc".to_string(), "v1".to_string()],
            check: HealthCheck {
                grpc: format!("{check_host}:{port}"),
                interval: "10s".to_string(),
                timeout: "5s".to_string(),
                deregister_critical_service_after: "30s".to_string(),
            },
        }
    }
}

/// Consul /v1/agent/self 响应（只取需要的字段）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct AgentSelf {
    config: AgentConfig,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct AgentConfig {
    node_name: String,
}

/// 判断字符串是否像 Docker 容器 ID（12 位十六进制）
fn looks_like_container_id(s: &str) -> bool {
    s.len() == 12 && s.chars().all(|c| c.is_ascii_hexdigit())
}

/// 解析 Consul 健康检查应该使用的 host 地址
///
/// 优先级：
/// 1. `CONSUL_CHECK_HOST` 环境变量（显式覆盖，适合特殊环境）
/// 2. 调 Consul `/v1/agent/self`，如果 NodeName 是 12 位 hex（容器 ID）→ 用 `host.docker.internal`
/// 3. 兜底使用传入的 `address`（Consul 在本地 / 同网络 / K8s Pod）
async fn resolve_check_host(address: &str, consul_url: &str) -> String {
    // 1. 环境变量显式指定
    if let Ok(host) = std::env::var("CONSUL_CHECK_HOST") {
        tracing::debug!(host = %host, "Using CONSUL_CHECK_HOST from env");
        return host;
    }

    // 2. 探测 Consul 是否在 Docker 容器内
    let url = format!("{}/v1/agent/self", consul_url.trim_end_matches('/'));
    match reqwest::get(&url).await {
        Ok(resp) => {
            if let Ok(agent) = resp.json::<AgentSelf>().await {
                let node_name = &agent.config.node_name;
                if looks_like_container_id(node_name) {
                    tracing::info!(
                        node_name = %node_name,
                        "Consul NodeName looks like container ID, using host.docker.internal"
                    );
                    return "host.docker.internal".to_string();
                }
                tracing::debug!(
                    node_name = %node_name,
                    "Consul NodeName is not a container ID, Consul is local"
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                error = %e,
                "Failed to query Consul /v1/agent/self, using fallback address"
            );
        }
    }

    // 3. 兜底：Consul 在本地或同网络，直接用服务地址
    tracing::debug!(
        address = %address,
        "Using service address as health check host"
    );
    address.to_string()
}
