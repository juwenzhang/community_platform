## ADDED Requirements

### Requirement: ListComments BFF 聚合

Gateway 的 `ListComments` gRPC service 实现 SHALL 聚合评论列表和评论者用户信息：

1. 调用 svc-content 的 `ListComments` RPC 获取评论列表
2. 提取所有评论的 `author_id`，去重
3. 批量调用 svc-user 的 `GetUser` RPC 获取用户信息
4. 将用户信息填充到每条评论的 `author` 字段
5. 如果某个用户查询失败，该评论的 `author` 字段保留为空（graceful degradation）

#### Scenario: 评论列表包含评论者信息

- **WHEN** 前端调用 `ListComments(article_id=xxx)`
- **THEN** 返回的每条评论中 `author` 字段包含用户 `id`、`username`、`display_name`、`avatar_url`

#### Scenario: 评论者用户不存在时优雅降级

- **WHEN** 某条评论的 `author_id` 对应的用户已被删除
- **THEN** 该评论的 `author` 字段为空（`None`），不影响其他评论正常返回

#### Scenario: 相同作者的评论不重复查询

- **WHEN** 10 条评论中有 5 条是同一用户发的
- **THEN** Gateway 只对该用户发起 1 次 `GetUser` 调用（去重后批量查询）

### Requirement: ListFavorites BFF 聚合

Gateway 的 `ListFavorites` gRPC service 实现 SHALL 聚合收藏列表和作者信息：

1. 调用 svc-content 的 `ListFavorites` RPC 获取收藏列表
2. 提取所有收藏条目中文章的 `author_id`，去重
3. 批量调用 svc-user 的 `GetUser` RPC 获取作者信息
4. 将作者信息填充到每个收藏条目的 `author` 字段

#### Scenario: 收藏列表包含文章作者信息

- **WHEN** 前端调用 `ListFavorites(user_id=xxx)`
- **THEN** 返回的每个收藏条目中包含文章信息和作者的 `username`、`display_name`、`avatar_url`

#### Scenario: 收藏列表支持分页参数

- **WHEN** 前端调用 `ListFavorites` 传入 `page_size=20` 和 `page_token`
- **THEN** 返回最多 20 条收藏记录和下一页 token（当前硬编码为 50 条无分页参数）

### Requirement: REST 路由聚合对齐

Gateway 的 REST 路由中文章列表接口 SHALL 与 gRPC 路径保持一致的聚合行为：

- REST `GET /api/v1/articles` 返回的文章列表 SHALL 包含作者信息（当前 REST 路径不聚合，gRPC 路径有 `fill_authors()`）
- REST 路由可复用 Gateway gRPC service 层的聚合逻辑，而非直接调用下游 svc-content

#### Scenario: REST 文章列表包含作者信息

- **WHEN** 通过 REST `GET /api/v1/articles` 获取文章列表
- **THEN** 每篇文章的 `author` 字段包含用户信息（与 gRPC 路径行为一致）

#### Scenario: REST 和 gRPC 路径行为一致

- **WHEN** 同时通过 REST 和 gRPC 请求文章列表
- **THEN** 两种路径返回的数据内容一致（格式不同：JSON vs Protobuf，但数据相同）
