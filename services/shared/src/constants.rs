//! 编译期常量
//!
//! 集中管理所有跨 crate 共享的常量，避免硬编码分散在各微服务中。

// ── 元数据 Key ──
pub const METADATA_USER_ID: &str = "x-user-id";
pub const METADATA_REQUEST_ID: &str = "x-request-id";
pub const AUTH_HEADER: &str = "authorization";
pub const BEARER_PREFIX: &str = "Bearer ";

// ── NATS Subject 前缀 ──
pub const NATS_PREFIX: &str = "luhanxin";
pub const NATS_EVENTS_PREFIX: &str = "luhanxin.events";
pub const NATS_RETRY_PREFIX: &str = "luhanxin.retry";
pub const NATS_DEADLETTER_PREFIX: &str = "luhanxin.deadletter";

// ── 服务名 ──
pub const SVC_USER: &str = "svc-user";
pub const SVC_CONTENT: &str = "svc-content";

// ── 分页 ──
pub const DEFAULT_PAGE_SIZE: i32 = 20;
pub const MAX_PAGE_SIZE: i32 = 100;
pub const MIN_PAGE_SIZE: i32 = 1;

// ── 校验规则 ──
pub const USERNAME_MIN_LEN: usize = 3;
pub const USERNAME_MAX_LEN: usize = 20;
pub const PASSWORD_MIN_LEN: usize = 8;
pub const PASSWORD_MAX_LEN: usize = 72;
pub const BCRYPT_COST: u32 = 12;

// ── Consul ──
pub const CONSUL_HEALTH_INTERVAL: &str = "10s";
pub const CONSUL_DEREGISTER_AFTER: &str = "30s";
pub const CONSUL_TAGS: &[&str] = &["grpc", "v1"];
