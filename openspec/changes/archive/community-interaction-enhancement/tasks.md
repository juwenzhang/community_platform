## Tasks

### Phase 1: Proto 定义（最高优先级）

#### Task 1: 定义 notification.proto
- [x] **完成**
- **依赖**: 无
- **描述**: 创建 `proto/luhanxin/community/v1/notification.proto`，定义 `NotificationService` 及所有 Request/Response message。运行 `make proto` 生成 Rust + TypeScript 代码。
- **验收**: `make proto` 成功，生成的代码无编译错误

#### Task 2: 定义 search.proto
- [x] **完成**
- **依赖**: 无
- **描述**: 创建 `proto/luhanxin/community/v1/search.proto`，定义 `SearchService`（SearchArticles + SearchUsers）及对应 message。运行 `make proto` 生成代码。
- **验收**: `make proto` 成功，生成的代码无编译错误

### Phase 2: Redis 缓存层（后端基础）

#### Task 3: shared crate Redis 客户端模块
- [x] **完成**
- **依赖**: 无
- **描述**: 在 `services/shared/src/` 新增 `redis/mod.rs`，封装 `redis-rs` + `deadpool-redis` 连接池。提供 `RedisPool::new(url)` 初始化、`get`/`set`/`del` 异步方法、连接失败优雅降级（log warning + bypass）。更新 `Cargo.toml` 添加依赖。
- **验收**: 单元测试通过（mock Redis），编译成功

#### Task 4: svc-content 集成 Redis 缓存
- **估时**: 2h
- **依赖**: Task 3
- **描述**: 在 `svc-content` 的 `GetArticle`、`ListArticles` handler 中接入 Cache-Aside 模式。文章详情 TTL 5min，列表 TTL 2min。写操作（Create/Update/Delete）时删除相关缓存 key。
- **验收**: 缓存命中/未命中/失效逻辑正确，Redis 不可用时降级到 DB

#### Task 5: svc-user 集成 Redis 缓存
- [x] **完成**
- **依赖**: Task 3
- **描述**: 在 `svc-user` 的 `GetUser`、`GetUserByUsername` handler 中接入 Cache-Aside 模式。用户信息 TTL 10min。`UpdateProfile` 时删除相关缓存 key。
- **验收**: 缓存命中/未命中/失效逻辑正确

### Phase 3: NATS 业务事件发布

#### Task 6: svc-content 发布 NATS 事件
- [x] **完成**
- **依赖**: 无
- **描述**: 在 `svc-content` 的评论创建、点赞、收藏、文章发布/更新/删除 handler 中，业务操作成功后同步发布 NATS 事件（EventEnvelope）。Subject 使用 `luhanxin.events.content.*` 和 `luhanxin.events.social.*`。发布失败只 log warning，不影响主流程。
- **验收**: 操作后 NATS 收到对应事件，发布失败时主业务不受影响

#### Task 7: svc-user 发布 NATS 事件
- **估时**: 1h
- **依赖**: 无
- **描述**: 在 `svc-user` 的 `UpdateProfile` handler 中，操作成功后发布 `luhanxin.events.user.updated` 事件。
- **验收**: 更新资料后 NATS 收到事件

### Phase 4: svc-notification 微服务

#### Task 8: svc-notification 项目脚手架
- **估时**: 2h
- **依赖**: Task 1
- **描述**: 创建 `services/svc-notification/` 项目结构（main.rs + config.rs + services/ + handlers/ + models/），配置 Cargo.toml（tonic、prost、sea-orm、redis、nats），实现 gRPC Server 启动 + Consul 注册。端口 50053。
- **验收**: `cargo build -p svc-notification` 成功，服务启动并在 Consul 注册

#### Task 9: notifications 数据库 migration
- **估时**: 1h
- **依赖**: 无
- **描述**: 在 `services/migration/` 新增 migration，创建 `notifications` 表（id, user_id, type, actor_id, target_type, target_id, is_read, created_at）+ 索引。生成 SeaORM Entity。
- **验收**: `sea-orm-cli migrate up` 成功，Entity 可编译

#### Task 10: svc-notification NATS 事件消费 + 通知创建
- **估时**: 2.5h
- **依赖**: Task 8, Task 9, Task 6
- **描述**: 实现 NATS 事件订阅（`luhanxin.events.content.>` + `luhanxin.events.social.>`），解析 EventEnvelope，创建 notification 记录。处理自我操作不生成通知的逻辑。实现通知去重（actor_id + target_id + type 组合）。
- **验收**: 评论/点赞/收藏事件能正确生成通知，自我操作不生成

#### Task 11: svc-notification gRPC Service 实现
- [x] **完成**
- **依赖**: Task 8, Task 9, Task 3
- **描述**: 实现 `NotificationService` trait 的 4 个 RPC 方法：ListNotifications（分页查询）、GetUnreadCount（Redis 缓存 1min TTL）、MarkAsRead、MarkAllAsRead。标记已读时失效 Redis 未读计数缓存。
- **验收**: grpcurl 测试 4 个接口正确响应

### Phase 5: Gateway 集成

#### Task 12: Gateway 注册 NotificationService
- [x] **完成**
- **依赖**: Task 11
- **描述**: Gateway 实现 `NotificationService` gRPC trait（BFF 层），内部通过 gRPC 客户端转发到 svc-notification。ServiceResolver 新增 svc-notification 解析。InterceptorPipeline 配置认证策略（NotificationService 所有方法需认证）。
- **验收**: 前端通过 Gateway 调用 NotificationService 接口成功

#### Task 13: Gateway 搜索 BFF 实现
- **估时**: 2.5h
- **依赖**: Task 2
- **描述**: Gateway 实现 `SearchService` gRPC trait，直接调用 Meilisearch HTTP API。SearchArticles 聚合作者信息（调用 svc-user），SearchUsers 直接返回。InterceptorPipeline 配置搜索接口为公开（跳过认证）。
- **验收**: grpcurl 测试搜索接口返回正确结果

### Phase 6: Meilisearch 索引同步

#### Task 14: Meilisearch 索引同步 worker
- [x] **完成**
- **依赖**: Task 6, Task 7
- **描述**: 在 svc-notification（或独立 worker）中实现 Meilisearch 索引同步：订阅文章和用户相关 NATS 事件，调用 Meilisearch HTTP API 创建/更新/删除索引文档。配置 articles 和 users 两个索引。
- **验收**: 文章创建/更新/删除后 Meilisearch 索引同步更新

### Phase 7: 前端通知组件

#### Task 15: useNotificationStore 状态管理
- **估时**: 1h
- **依赖**: Task 1（需要生成的 TypeScript 类型）
- **描述**: 创建 `apps/main/src/stores/useNotificationStore.ts`（Zustand），实现：未读计数轮询（30s 间隔）、通知列表加载、标记已读/全部已读。使用 Connect RPC 调用 NotificationService。
- **验收**: Store 方法正确调用 API，状态更新正确

#### Task 16: NotificationBell 组件
- **估时**: 2h
- **依赖**: Task 15
- **描述**: 创建 `apps/main/src/components/NotificationBell/` 目录化组件。BellOutlined 图标 + Badge 未读数 + Popover 通知列表。列表每条包含：actor 头像、操作描述、目标文章标题、时间。点击跳转文章并标记已读。面板顶部"全部已读"按钮。
- **验收**: 铃铛图标正确展示未读数，点击弹出通知列表，交互正确

#### Task 17: Header 集成通知铃铛
- **估时**: 1h
- **依赖**: Task 16
- **描述**: 修改 Header 组件，在 UserArea 左侧新增 NotificationBell。只在已登录状态展示。调整 Header 右侧布局。
- **验收**: Header 正确展示铃铛，已登录/未登录状态切换正确

### Phase 8: 前端搜索结果页

#### Task 18: 搜索结果页
- **估时**: 2.5h
- **依赖**: Task 2（TypeScript 类型）, Task 13（搜索 API 可用）
- **描述**: 创建 `apps/main/src/pages/search/` 页面。URL `/search?q=<query>`，Tab 切换（文章/用户），搜索结果高亮显示，分页加载。修改 Header 搜索框 Enter 行为跳转到搜索页。添加路由配置。
- **验收**: 搜索结果页正确展示文章和用户结果，高亮正确

### Phase 9: Docker Compose 配置

#### Task 19: 更新 Docker Compose 配置
- [x] **完成**
- **依赖**: Task 8
- **描述**: 在 `docker/docker-compose.yml` 中新增 svc-notification 服务定义。更新端口映射（50053）。更新 `.env.example` 新增相关配置。
- **验收**: `docker compose up` 启动所有服务无报错
