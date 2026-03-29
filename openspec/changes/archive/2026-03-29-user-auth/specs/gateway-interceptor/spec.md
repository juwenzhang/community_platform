## MODIFIED Requirements

### Requirement: 拦截器管道扩展

InterceptorPipeline SHALL 新增 `AuthInterceptor` 作为前置拦截器。

拦截器执行顺序：
1. `LogInterceptor`（前置）— 记录请求日志
2. `AuthInterceptor`（前置）— JWT 验证 + 注入 user_id
3. `LogInterceptor`（后置）— 记录响应日志
4. `RetryInterceptor`（后置）— 失败重试入队

#### Scenario: AuthInterceptor 在 LogInterceptor 之后执行

- **WHEN** 一个需认证的请求到达 Gateway
- **THEN** 先记录日志，再验证 token，验证失败则不调用下游
