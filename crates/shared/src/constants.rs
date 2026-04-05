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

// ── NATS 业务事件 Subject ──
pub const NATS_EVENT_CONTENT_COMMENTED: &str = "luhanxin.events.content.commented";
pub const NATS_EVENT_CONTENT_MENTIONED: &str = "luhanxin.events.content.mentioned";
pub const NATS_EVENT_CONTENT_PUBLISHED: &str = "luhanxin.events.content.published";
pub const NATS_EVENT_CONTENT_UPDATED: &str = "luhanxin.events.content.updated";
pub const NATS_EVENT_CONTENT_DELETED: &str = "luhanxin.events.content.deleted";
pub const NATS_EVENT_SOCIAL_LIKED: &str = "luhanxin.events.social.liked";
pub const NATS_EVENT_SOCIAL_UNLIKED: &str = "luhanxin.events.social.unliked";
pub const NATS_EVENT_SOCIAL_FAVORITED: &str = "luhanxin.events.social.favorited";
pub const NATS_EVENT_SOCIAL_UNFAVORITED: &str = "luhanxin.events.social.unfavorited";
pub const NATS_EVENT_USER_UPDATED: &str = "luhanxin.events.user.updated";

// ── 服务名 ──
pub const SVC_USER: &str = "svc-user";
pub const SVC_CONTENT: &str = "svc-content";
pub const SVC_NOTIFICATION: &str = "svc-notification";

// ── Redis Key 前缀 ──
pub const REDIS_PREFIX: &str = "luhanxin";
pub const REDIS_ARTICLE_KEY_PREFIX: &str = "luhanxin:article:";
pub const REDIS_USER_KEY_PREFIX: &str = "luhanxin:user:";
pub const REDIS_USER_USERNAME_KEY_PREFIX: &str = "luhanxin:user:username:";
pub const REDIS_NOTIFICATION_UNREAD_KEY_PREFIX: &str = "luhanxin:notification:unread:";

// ── 缓存 TTL（秒）──
pub const CACHE_TTL_ARTICLE: u64 = 300;       // 5 minutes
pub const CACHE_TTL_USER: u64 = 600;          // 10 minutes
pub const CACHE_TTL_UNREAD_COUNT: u64 = 60;   // 1 minute

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
