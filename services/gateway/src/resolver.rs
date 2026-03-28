//! 服务解析器
//!
//! 通过 Consul 动态发现下游微服务，维护 gRPC Channel 连接池，
//! 使用 Round Robin 负载均衡。Consul 不可达时 fallback 到环境变量。

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tonic::transport::Channel;
use tracing::{info, warn};

use shared::discovery::{ConsulClient, ServiceInstance};

/// 单个服务的连接池
#[allow(dead_code)]
struct ServicePool {
    instances: Vec<ServiceInstance>,
    channels: Vec<Channel>,
    counter: AtomicUsize,
}

impl ServicePool {
    /// Round Robin 获取下一个 Channel
    fn next_channel(&self) -> Option<Channel> {
        if self.channels.is_empty() {
            return None;
        }
        let idx = self.counter.fetch_add(1, Ordering::Relaxed) % self.channels.len();
        Some(self.channels[idx].clone())
    }
}

/// 服务解析器
///
/// 维护 Consul 缓存 + Channel 连接池 + 环境变量 fallback。
pub struct ServiceResolver {
    consul: ConsulClient,
    cache: Arc<RwLock<HashMap<String, ServicePool>>>,
    fallback_urls: HashMap<String, String>,
}

impl ServiceResolver {
    pub fn new(consul: ConsulClient, fallback_urls: HashMap<String, String>) -> Self {
        Self {
            consul,
            cache: Arc::new(RwLock::new(HashMap::new())),
            fallback_urls,
        }
    }

    /// 获取指定服务的 gRPC Channel（Round Robin）
    ///
    /// 优先从 Consul 缓存获取，缓存为空时 fallback 到环境变量。
    pub async fn get_channel(&self, service_name: &str) -> Result<Channel, tonic::Status> {
        // 1. 尝试从缓存获取
        {
            let cache = self.cache.read().await;
            if let Some(pool) = cache.get(service_name) {
                if let Some(channel) = pool.next_channel() {
                    return Ok(channel);
                }
            }
        }

        // 2. 缓存为空，尝试从 Consul 拉取一次
        if let Ok(instances) = self.consul.healthy_instances(service_name).await {
            if !instances.is_empty() {
                let mut channels = Vec::new();
                for inst in &instances {
                    match Channel::from_shared(inst.url())
                        .map_err(|e| tonic::Status::internal(e.to_string()))?
                        .connect()
                        .await
                    {
                        Ok(ch) => channels.push(ch),
                        Err(e) => {
                            warn!(
                                instance = %inst.url(),
                                error = %e,
                                "Failed to connect to instance, skipping"
                            );
                        }
                    }
                }

                if !channels.is_empty() {
                    let channel = channels[0].clone();
                    let mut cache = self.cache.write().await;
                    cache.insert(
                        service_name.to_string(),
                        ServicePool {
                            instances,
                            channels,
                            counter: AtomicUsize::new(1),
                        },
                    );
                    return Ok(channel);
                }
            }
        }

        // 3. Fallback 到环境变量
        if let Some(url) = self.fallback_urls.get(service_name) {
            warn!(
                service = %service_name,
                url = %url,
                "Using fallback URL (Consul cache empty)"
            );
            let channel = Channel::from_shared(url.clone())
                .map_err(|e| tonic::Status::internal(e.to_string()))?
                .connect()
                .await
                .map_err(|e| {
                    tonic::Status::unavailable(format!(
                        "{service_name} unavailable (fallback failed): {e}"
                    ))
                })?;
            return Ok(channel);
        }

        Err(tonic::Status::unavailable(format!(
            "{service_name} not found in Consul or fallback"
        )))
    }

    /// 启动后台 Watch 任务，监听 Consul 服务变更并刷新缓存
    pub fn start_watcher(self: &Arc<Self>, service_name: &str) -> JoinHandle<()> {
        let resolver = Arc::clone(self);
        let name = service_name.to_string();

        tokio::spawn(async move {
            let mut index = 0u64;

            loop {
                match resolver.consul.watch(&name, index).await {
                    Ok(result) => {
                        if result.index != index {
                            info!(
                                service = %name,
                                instances = result.instances.len(),
                                index = result.index,
                                "Service instances updated from Consul"
                            );

                            // 为新实例建立 Channel
                            let mut channels = Vec::new();
                            for inst in &result.instances {
                                let endpoint = match Channel::from_shared(inst.url()) {
                                    Ok(ep) => ep,
                                    Err(_) => continue,
                                };
                                match endpoint.connect().await {
                                    Ok(ch) => channels.push(ch),
                                    Err(e) => {
                                        warn!(
                                            instance = %inst.url(),
                                            error = %e,
                                            "Failed to connect during watch refresh"
                                        );
                                    }
                                }
                            }

                            let mut cache = resolver.cache.write().await;
                            cache.insert(
                                name.clone(),
                                ServicePool {
                                    instances: result.instances,
                                    channels,
                                    counter: AtomicUsize::new(0),
                                },
                            );

                            index = result.index;
                        }
                    }
                    Err(e) => {
                        warn!(
                            service = %name,
                            error = %e,
                            "Consul watch failed, retrying in 5s (using cached instances)"
                        );
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                }
            }
        })
    }
}
