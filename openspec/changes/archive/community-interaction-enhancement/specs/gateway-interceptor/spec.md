## MODIFIED Requirements

### Requirement: 拦截器管道扩展

InterceptorPipeline SHALL 包含以下拦截器，按此顺序执行：

1. `LogInterceptor`（前置）— 记录请求日志
2. `AuthInterceptor`（前置）— JWT 验证 + 注入 user_id 到 ctx.attrs
3. `LogInterceptor`（后置）— 记录响应日志
4. `RetryInterceptor`（后置）— 失败重试入队

NotificationService 和 SearchService 的认证策略：
- `ListNotifications`、`GetUnreadCount`、`MarkAsRead`、`MarkAllAsRead` — **需要认证**
- `SearchArticles`、`SearchUsers` — **公开接口，不需要认证**

#### Scenario: AuthInterceptor 在 LogInterceptor 之后执行

- **WHEN** 一个需认证的请求到达 Gateway
- **THEN** 先记录日志，再验证 token，验证失败则不调用下游

#### Scenario: SearchService 跳过认证

- **WHEN** SearchArticles 请求到达 Gateway
- **THEN** AuthInterceptor 识别为公开接口，跳过 JWT 验证
