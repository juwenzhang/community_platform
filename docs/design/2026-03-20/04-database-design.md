# 数据库设计 — PostgreSQL + Redis

> 📅 创建日期：2026-03-20
> 📌 状态：Draft — 待 Review

---

## 1. 设计原则

1. **规范化优先**：核心表遵循 3NF，冗余数据通过缓存或物化视图处理
2. **UUID 主键**：所有表使用 UUID v4 作为主键，便于分布式场景
3. **软删除**：核心数据使用 `deleted_at` 软删除，可恢复
4. **审计字段**：所有表包含 `created_at`、`updated_at`
5. **索引策略**：高频查询字段创建索引，使用 GIN 索引支持全文搜索

---

## 2. ER 关系图

```
┌──────────────┐     1:1      ┌──────────────────┐
│    users     │─────────────▶│  user_profiles   │
└──────┬───────┘              └──────────────────┘
       │ 1:N
       ├──────────────────────▶ articles
       │ 1:N
       ├──────────────────────▶ comments
       │ 1:N
       ├──────────────────────▶ drafts
       │
       │         M:N (user_follows)
       ├──────────────────────▶ users (self-referencing)
       │
       │ 1:N
       ├──────────────────────▶ likes
       │ 1:N
       ├──────────────────────▶ bookmarks
       │ 1:N
       └──────────────────────▶ notifications

┌──────────────┐     M:N      ┌──────────────────┐
│   articles   │─────────────▶│      tags        │
└──────┬───────┘  (article_tags)└─────────────────┘
       │ 1:N
       ├──────────────────────▶ comments
       │ 1:N
       ├──────────────────────▶ likes
       │ 1:N
       └──────────────────────▶ bookmarks
```

---

## 3. 表结构设计

### 3.1 用户相关

```sql
-- ==========================================
-- 用户表
-- ==========================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),                     -- OAuth 用户可能为空
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, banned, deactivated
    role            VARCHAR(20) NOT NULL DEFAULT 'user',    -- user, moderator, admin
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);

-- ==========================================
-- 用户档案表
-- ==========================================
CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    bio             TEXT,                             -- 个人简介
    website         VARCHAR(500),
    location        VARCHAR(100),
    company         VARCHAR(100),
    github_username VARCHAR(100),
    skills          TEXT[] DEFAULT '{}',              -- 技能标签数组
    article_count   INTEGER NOT NULL DEFAULT 0,      -- 冗余计数
    follower_count  INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    like_received   INTEGER NOT NULL DEFAULT 0,      -- 获赞总数
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- ==========================================
-- OAuth 第三方登录
-- ==========================================
CREATE TABLE user_oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,             -- github, google, etc.
    provider_id     VARCHAR(255) NOT NULL,            -- 第三方平台用户ID
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_user_id ON user_oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider ON user_oauth_accounts(provider, provider_id);

-- ==========================================
-- 用户关注关系
-- ==========================================
CREATE TABLE user_follows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)               -- 不能关注自己
);

CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);
```

### 3.2 内容相关

```sql
-- ==========================================
-- 文章表
-- ==========================================
CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    slug            VARCHAR(250) NOT NULL UNIQUE,     -- URL 友好标识
    summary         VARCHAR(500),                     -- 摘要
    content         TEXT NOT NULL,                    -- Markdown 原文
    content_html    TEXT,                             -- 渲染后 HTML (缓存)
    cover_image     VARCHAR(500),                     -- 封面图
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, published, archived
    visibility      VARCHAR(20) NOT NULL DEFAULT 'public', -- public, private, unlisted
    word_count      INTEGER NOT NULL DEFAULT 0,
    reading_time    INTEGER NOT NULL DEFAULT 0,       -- 预计阅读时间(分钟)
    view_count      INTEGER NOT NULL DEFAULT 0,
    like_count      INTEGER NOT NULL DEFAULT 0,       -- 冗余计数
    comment_count   INTEGER NOT NULL DEFAULT 0,
    bookmark_count  INTEGER NOT NULL DEFAULT 0,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,   -- 置顶
    published_at    TIMESTAMPTZ,                      -- 发布时间
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_slug ON articles(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_articles_status ON articles(status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_articles_published ON articles(published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_articles_popular ON articles(like_count DESC, view_count DESC) WHERE status = 'published' AND deleted_at IS NULL;

-- 全文搜索索引 (PostgreSQL tsvector)
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- 触发器：自动更新 search_vector
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_search_vector
    BEFORE INSERT OR UPDATE OF title, summary, content ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_vector_update();

-- ==========================================
-- 草稿表 (独立于文章，支持自动保存)
-- ==========================================
CREATE TABLE drafts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID NOT NULL REFERENCES users(id),
    article_id      UUID REFERENCES articles(id),     -- 关联已发布文章 (编辑场景)
    title           VARCHAR(200),
    content         TEXT,
    cover_image     VARCHAR(500),
    tags            TEXT[] DEFAULT '{}',               -- 临时标签 (发布时关联)
    auto_saved_at   TIMESTAMPTZ,                      -- 最后自动保存时间
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drafts_author ON drafts(author_id);

-- ==========================================
-- 标签表
-- ==========================================
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL UNIQUE,
    slug            VARCHAR(60) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        VARCHAR(500),                     -- 标签图标
    color           VARCHAR(7),                       -- 标签颜色 (#hex)
    article_count   INTEGER NOT NULL DEFAULT 0,       -- 冗余计数
    follower_count  INTEGER NOT NULL DEFAULT 0,
    is_official     BOOLEAN NOT NULL DEFAULT FALSE,   -- 官方标签
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_popular ON tags(article_count DESC);

-- ==========================================
-- 文章-标签 多对多
-- ==========================================
CREATE TABLE article_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(article_id, tag_id)
);

CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- ==========================================
-- 评论表 (支持嵌套)
-- ==========================================
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    parent_id       UUID REFERENCES comments(id),     -- 父评论 (NULL=顶级)
    content         TEXT NOT NULL,
    like_count      INTEGER NOT NULL DEFAULT 0,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_comments_article ON comments(article_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
```

### 3.3 社交互动

```sql
-- ==========================================
-- 点赞表 (多态：文章、评论)
-- ==========================================
CREATE TABLE likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type     VARCHAR(20) NOT NULL,             -- article, comment
    target_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);

-- ==========================================
-- 收藏表
-- ==========================================
CREATE TABLE bookmarks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_article ON bookmarks(article_id);

-- ==========================================
-- 阅读记录
-- ==========================================
CREATE TABLE reading_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    read_progress   REAL NOT NULL DEFAULT 0,          -- 0.0 ~ 1.0
    read_duration   INTEGER NOT NULL DEFAULT 0,       -- 阅读时长(秒)
    last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_reading_user ON reading_history(user_id, last_read_at DESC);
```

### 3.4 通知系统

```sql
-- ==========================================
-- 通知表
-- ==========================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id),         -- 系统通知时为 NULL
    type            VARCHAR(50) NOT NULL,              -- like, comment, follow, mention, system
    title           VARCHAR(200),
    content         TEXT,
    target_type     VARCHAR(20),                      -- article, comment, user
    target_id       UUID,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, created_at DESC) WHERE is_read = FALSE;
```

### 3.5 系统与审计

```sql
-- ==========================================
-- 举报表
-- ==========================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID NOT NULL REFERENCES users(id),
    target_type     VARCHAR(20) NOT NULL,              -- article, comment, user
    target_id       UUID NOT NULL,
    reason          VARCHAR(50) NOT NULL,              -- spam, inappropriate, etc.
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, resolved, dismissed
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at);

-- ==========================================
-- 操作日志 (审计)
-- ==========================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,              -- create, update, delete, login, etc.
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

---

## 4. Redis 缓存策略

### 4.1 缓存 Key 约定

```
luhanxin:<domain>:<identifier>:<field>
```

### 4.2 缓存设计

| Key 模式 | 数据类型 | TTL | 说明 |
|---------|---------|-----|------|
| `luhanxin:user:{id}` | Hash | 1h | 用户基本信息缓存 |
| `luhanxin:user:{id}:profile` | Hash | 1h | 用户档案缓存 |
| `luhanxin:article:{id}` | Hash | 30m | 文章详情缓存 |
| `luhanxin:article:{slug}:id` | String | 24h | slug → id 映射 |
| `luhanxin:feed:latest:{page}` | List | 5m | 最新文章 Feed 缓存 |
| `luhanxin:feed:hot:{page}` | List | 10m | 热门文章 Feed 缓存 |
| `luhanxin:tag:{slug}:articles:{page}` | List | 10m | 标签文章列表 |
| `luhanxin:user:{id}:unread_count` | String | - | 未读通知计数 |
| `luhanxin:session:{token}` | Hash | 根据 JWT TTL | 会话信息 |
| `luhanxin:rate_limit:{ip}:{endpoint}` | String | 1m | 限流计数器 |
| `luhanxin:article:{id}:view_count` | String | - | 浏览量计数器 (定期刷回 DB) |

### 4.3 缓存更新策略

- **Cache-Aside (旁路缓存)**：读时查缓存→miss→查 DB→写缓存
- **Write-Through**：写入时同时更新缓存和 DB
- **计数器特殊处理**：浏览量、点赞数等高频更新字段，先更新 Redis，定时任务批量刷回 DB

### 4.4 Redis Streams — 事件队列

```
Stream: luhanxin:events:social
├── {action: "like", user_id: "...", target_type: "article", target_id: "..."}
├── {action: "bookmark", user_id: "...", article_id: "..."}
└── {action: "follow", follower_id: "...", following_id: "..."}

Stream: luhanxin:events:content
├── {action: "publish", article_id: "...", author_id: "..."}
├── {action: "comment", comment_id: "...", article_id: "...", author_id: "..."}
└── {action: "update", article_id: "..."}

Consumer Groups:
├── notification-service  → 监听 social + content → 生成通知
├── search-service       → 监听 content → 更新搜索索引
└── counter-service      → 监听 social → 更新计数器
```

---

## 5. 数据库迁移管理

使用 `sea-orm-migration` 进行版本化迁移：

```
services/migration/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── main.rs
    ├── m20260320_000001_create_users_table.rs
    ├── m20260320_000002_create_user_profiles_table.rs
    ├── m20260320_000003_create_user_oauth_accounts_table.rs
    ├── m20260320_000004_create_user_follows_table.rs
    ├── m20260320_000005_create_articles_table.rs
    ├── m20260320_000006_create_tags_table.rs
    ├── m20260320_000007_create_article_tags_table.rs
    ├── m20260320_000008_create_comments_table.rs
    ├── m20260320_000009_create_drafts_table.rs
    ├── m20260320_000010_create_likes_table.rs
    ├── m20260320_000011_create_bookmarks_table.rs
    ├── m20260320_000012_create_notifications_table.rs
    ├── m20260320_000013_create_reading_history_table.rs
    ├── m20260320_000014_create_reports_table.rs
    └── m20260320_000015_create_audit_logs_table.rs
```

---

## 6. 性能优化建议

1. **连接池**：使用 SeaORM 内置的 SQLx 连接池，生产环境 50-100 连接
2. **读写分离**：后期可引入 PostgreSQL 主从复制，读请求走从库
3. **分区表**：`audit_logs`、`reading_history` 按月分区
4. **物化视图**：热门文章排行榜使用物化视图，定时刷新
5. **批量操作**：计数器更新采用 Redis Pipeline + 定时批量刷回
6. **慢查询监控**：PostgreSQL `pg_stat_statements` 监控慢查询
