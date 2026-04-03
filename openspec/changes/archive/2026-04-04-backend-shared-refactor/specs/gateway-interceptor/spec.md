## MODIFIED Requirements

### Requirement: Gateway gRPC Service 使用拦截器

Gateway 的每个 gRPC Service trait 实现 SHALL 通过 InterceptorPipeline 包裹 RPC 调用。

- 每个方法体结构统一：`run_pre → 调用下游 RPC → run_post → 返回结果`
- `InterceptorPipeline` 通过 Gateway 启动时配置注入
- **新增**：`inject_user_id` 逻辑 SHALL 统一使用 `shared::extract::extract_user_id` 和 `shared::extract::try_extract_user_id`，不在各 service 文件中重复实现
  - 需认证的接口（如 `CreateArticle`、`UpdateProfile`、`CreateComment`）使用 `extract_user_id`（缺失返回 `Unauthenticated`）
  - 可选认证的接口（如 `GetArticle` 查看是否已点赞）使用 `try_extract_user_id`（缺失返回 `None`）
- **新增**：Gateway 各 service 文件中的 `forward_public!` / `forward_authed!` 宏模式 SHALL 被推广到所有 service（目前仅 user service 使用）

#### Scenario: GetUser 请求经过完整拦截链

- **WHEN** 前端发送 GetUser gRPC-Web 请求
- **THEN** 请求依次经过 LogInterceptor(pre) → AuthInterceptor(pre) → 调用 svc-user → LogInterceptor(post) → RetryInterceptor(post)

#### Scenario: inject_user_id 使用统一 shared 实现

- **WHEN** 查看 `gateway/src/services/comment/mod.rs` 代码
- **THEN** 使用 `shared::extract::extract_user_id(&request)` 而非本地定义的 `inject_user_id` 函数

#### Scenario: CreateComment 缺少 user_id 返回 Unauthenticated

- **WHEN** 未认证用户调用 `CreateComment`
- **THEN** Gateway 返回 `Status::unauthenticated`（不再静默跳过）

#### Scenario: GetArticle 可选认证正常工作

- **WHEN** 未认证用户调用 `GetArticle`
- **THEN** 正常返回文章内容，`current_user_id` 为 None（不报错）
