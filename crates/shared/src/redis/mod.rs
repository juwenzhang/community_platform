use deadpool_redis::{Config, Pool, Runtime, Connection};
use tracing::{info, warn};

/// Redis 连接池封装
///
/// 基于 `deadpool-redis` 提供异步连接池。
/// 所有缓存操作通过此结构访问 Redis，连接失败时优雅降级。
#[derive(Clone)]
pub struct RedisPool {
    pool: Pool,
}

impl RedisPool {
    /// 创建 Redis 连接池
    ///
    /// # Arguments
    /// - `redis_url` - Redis 连接字符串，如 `redis://127.0.0.1:6379`
    pub fn new(redis_url: &str) -> Result<Self, RedisError> {
        let cfg = Config::from_url(redis_url);
        let pool = cfg
            .create_pool(Some(Runtime::Tokio1))
            .map_err(|e| RedisError::PoolCreate(e.to_string()))?;
        info!("Redis pool created (url: {})", redact_url(redis_url));
        Ok(Self { pool })
    }

    /// 获取连接（如果 Redis 不可用，返回 None 而不是 panic）
    pub async fn get_conn(&self) -> Option<Connection> {
        match self.pool.get().await {
            Ok(conn) => Some(conn),
            Err(e) => {
                warn!("Redis connection failed (degrading to DB): {}", e);
                None
            }
        }
    }

    /// GET — 获取字符串值，Redis 不可用或 key 不存在返回 None
    pub async fn get(&self, key: &str) -> Option<String> {
        let mut conn = self.get_conn().await?;
        match redis::cmd("GET").arg(key).query_async::<Option<String>>(&mut conn).await {
            Ok(val) => val,
            Err(e) => {
                warn!("Redis GET '{}' failed: {}", key, e);
                None
            }
        }
    }

    /// SET — 设置字符串值并指定 TTL（秒）
    pub async fn set(&self, key: &str, value: &str, ttl_secs: u64) -> bool {
        let Some(mut conn) = self.get_conn().await else {
            return false;
        };
        match redis::cmd("SET")
            .arg(key)
            .arg(value)
            .arg("EX")
            .arg(ttl_secs)
            .query_async::<()>(&mut conn)
            .await
        {
            Ok(()) => true,
            Err(e) => {
                warn!("Redis SET '{}' failed: {}", key, e);
                false
            }
        }
    }

    /// DEL — 删除一个或多个 key
    pub async fn del(&self, keys: &[&str]) -> bool {
        if keys.is_empty() {
            return true;
        }
        let Some(mut conn) = self.get_conn().await else {
            return false;
        };
        match redis::cmd("DEL")
            .arg(keys)
            .query_async::<i64>(&mut conn)
            .await
        {
            Ok(_) => true,
            Err(e) => {
                warn!("Redis DEL {:?} failed: {}", keys, e);
                false
            }
        }
    }

    /// 检查连接是否健康
    pub async fn is_healthy(&self) -> bool {
        let Some(mut conn) = self.get_conn().await else {
            return false;
        };
        redis::cmd("PING")
            .query_async::<String>(&mut conn)
            .await
            .is_ok()
    }
}

/// Redis 模块错误
#[derive(Debug, thiserror::Error)]
pub enum RedisError {
    #[error("Failed to create Redis pool: {0}")]
    PoolCreate(String),
}

/// 隐藏 URL 中的密码
fn redact_url(url: &str) -> String {
    if let Some(at_pos) = url.find('@') {
        if let Some(slash_pos) = url[..at_pos].rfind("://") {
            return format!("{}://***@{}", &url[..slash_pos], &url[at_pos + 1..]);
        }
    }
    url.to_string()
}
