## MODIFIED Requirements

### Requirement: Gateway BFF 代理模式

Gateway SHALL 作为 BFF（Backend for Frontend）层，实现各微服务的 gRPC Service trait：

- 每个 Service trait 的实现内部调用对应微服务的 gRPC 客户端
- Gateway 层可添加横切逻辑（认证、限流、日志、错误转换）
- 前端只与 Gateway 通信，不直接调用微服务
- 微服务地址通过 `ServiceResolver` 从 Consul 动态解析，不再依赖硬编码环境变量。当 Consul 不可达时 fallback 到环境变量。
- **新增**：Gateway 的 gRPC Service 实现 SHALL 在必要时聚合多个下游服务的数据，而非纯透传。关键聚合场景：
  - `ListArticles` — 聚合文章列表 + 作者信息（已有 `fill_authors()`）
  - `ListComments` — 聚合评论列表 + 评论者信息（新增）
  - `ListFavorites` — 聚合收藏列表 + 作者信息（新增）
- **新增**：REST 路由 SHALL 与 gRPC 路径保持一致的数据聚合行为

#### Scenario: Gateway 通过 Consul 转发 GetUser 请求

- **WHEN** Gateway 收到 `GetUser` gRPC-Web 请求
- **THEN** Gateway 从 Consul 解析 svc-user 地址，调用其 gRPC 端点，返回用户信息

#### Scenario: svc-user 不可用时返回错误并入队重试

- **WHEN** svc-user 未启动或不可达
- **THEN** Gateway 返回 gRPC Status `UNAVAILABLE`，同时将请求写入 NATS 重试队列

#### Scenario: Consul 不可达时使用 fallback 地址

- **WHEN** Consul 不可达但 `SVC_USER_URL` 环境变量已设置
- **THEN** Gateway 使用环境变量地址转发请求

#### Scenario: ListComments 返回聚合数据

- **WHEN** 前端调用 `ListComments(article_id=xxx)` 通过 Gateway
- **THEN** 返回的每条评论包含 `author` 用户信息对象（由 Gateway 聚合 svc-content + svc-user）

#### Scenario: ListFavorites 返回聚合数据

- **WHEN** 前端调用 `ListFavorites(user_id=xxx)` 通过 Gateway
- **THEN** 返回的每个收藏条目包含文章作者信息（由 Gateway 聚合）

#### Scenario: REST 和 gRPC 文章列表行为一致

- **WHEN** 通过 REST `GET /api/v1/articles` 和 gRPC `ListArticles` 同时请求
- **THEN** 两种路径返回的文章列表均包含作者信息
