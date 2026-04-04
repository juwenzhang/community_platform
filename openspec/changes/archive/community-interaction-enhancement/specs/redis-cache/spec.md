## ADDED Requirements

### Requirement: Redis client module
The shared crate SHALL provide a Redis client module wrapping `redis-rs` + `deadpool-redis` for async connection pooling.

#### Scenario: Client initialization
- **WHEN** a microservice starts and calls `RedisPool::new(redis_url)`
- **THEN** system creates a connection pool with default max connections

#### Scenario: Connection failure
- **WHEN** Redis is unreachable
- **THEN** system logs error and the calling service degrades gracefully (bypasses cache, queries DB directly)

### Requirement: Article detail caching
The system SHALL cache article detail responses in Redis with Cache-Aside pattern and 5-minute TTL.

#### Scenario: Cache hit
- **WHEN** GetArticle is called and the article is in Redis cache
- **THEN** system returns the cached article without querying PostgreSQL

#### Scenario: Cache miss
- **WHEN** GetArticle is called and the article is NOT in Redis cache
- **THEN** system queries PostgreSQL, stores result in Redis with 5-minute TTL, and returns the article

#### Scenario: Cache invalidation on update
- **WHEN** an article is updated or deleted
- **THEN** system deletes the article's Redis cache key (`luhanxin:article:{id}`)

### Requirement: User info caching
The system SHALL cache user info responses in Redis with 10-minute TTL.

#### Scenario: Cache hit
- **WHEN** GetUser or GetUserByUsername is called and the user is in Redis cache
- **THEN** system returns the cached user without querying PostgreSQL

#### Scenario: Cache invalidation on profile update
- **WHEN** a user updates their profile
- **THEN** system deletes the user's Redis cache keys (`luhanxin:user:{id}` and `luhanxin:user:username:{username}`)

### Requirement: Notification unread count caching
The system SHALL cache notification unread count in Redis with 1-minute TTL.

#### Scenario: Cache hit
- **WHEN** GetUnreadCount is called and count is in Redis
- **THEN** system returns cached count

#### Scenario: Cache invalidation on new notification
- **WHEN** a new notification is created or notifications are marked as read
- **THEN** system deletes the unread count cache key (`luhanxin:notification:unread:{user_id}`)

### Requirement: Graceful degradation
The system SHALL continue functioning when Redis is unavailable, falling back to database queries.

#### Scenario: Redis down
- **WHEN** Redis connection fails during a cache read
- **THEN** system logs warning, skips cache, and queries database directly without returning error to user
