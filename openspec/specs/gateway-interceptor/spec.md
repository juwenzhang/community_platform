## Purpose

为 Gateway 提供 RPC 拦截器管道，支持在 gRPC 调用前后插入横切逻辑（认证、限流、日志、重试等）。

## Requirements

### Requirement: Interceptor Trait 定义

Gateway SHALL 定义 `PreInterceptor` 和 `PostInterceptor` trait，用于在 gRPC 调用前后插入横切逻辑。

- `PreInterceptor::intercept()` 接收 `RpcContext` 和 tonic `MetadataMap` 引用，返回 `Result<(), Status>`
- `PostInterceptor::intercept()` 接收 `RpcContext` 和调用结果，返回 `Result<(), Status>`
- `RpcContext` 包含 service 名、method 名、start_time（请求开始时间）、attrs（拦截器间传递数据的 map）
- 拦截器只操作 **metadata 层**（认证 token、trace_id、限流标识等），不访问请求体
- 需要请求体的场景（参数校验、基于内容的权限判断）在各 service 方法中直接处理
- 前置拦截返回 `Err(Status)` 时，直接短路返回错误，不调用下游 RPC

#### Scenario: 前置拦截器阻止未授权请求

- **WHEN** `AuthInterceptor` 检测到请求缺少有效 JWT token
- **THEN** 返回 `Status::unauthenticated`，Gateway 不调用下游 RPC

#### Scenario: 后置拦截器记录审计日志

- **WHEN** RPC 调用完成后 `LogInterceptor` 被触发
- **THEN** 记录包含 service、method、耗时、状态的结构化日志

### Requirement: InterceptorPipeline 组合能力

Gateway SHALL 提供 `InterceptorPipeline` 结构体，支持组合多个拦截器并按顺序执行。

- `add_pre()` 方法添加前置拦截器
- `add_post()` 方法添加后置拦截器
- `run_pre()` 按添加顺序执行所有前置拦截器
- `run_post()` 按添加顺序执行所有后置拦截器
- Pipeline 可被多个 gRPC Service 实现共享（通过 Arc）

#### Scenario: 多个前置拦截器按顺序执行

- **WHEN** Pipeline 中有 LogInterceptor 和 AuthInterceptor 两个前置拦截器
- **THEN** 先执行 LogInterceptor，再执行 AuthInterceptor

#### Scenario: 前置拦截器短路

- **WHEN** 第一个前置拦截器返回 Err
- **THEN** 后续前置拦截器不再执行，直接返回错误

### Requirement: LogInterceptor 实现

Gateway SHALL 提供 `LogInterceptor` 作为默认的日志拦截器。

- 前置 hook：记录请求到达（service、method）
- 后置 hook：记录请求完成（service、method、耗时、成功/失败状态）
- 使用 `tracing` 结构化日志

#### Scenario: 成功请求的日志输出

- **WHEN** GetUser RPC 调用成功
- **THEN** 日志输出包含 `service="user", method="get_user", status="ok", duration_ms=12`

#### Scenario: 失败请求的日志输出

- **WHEN** GetUser RPC 调用返回 UNAVAILABLE
- **THEN** 日志输出包含 `service="user", method="get_user", status="unavailable", duration_ms=5032`

### Requirement: Gateway gRPC Service 使用拦截器

Gateway 的每个 gRPC Service trait 实现 SHALL 通过 InterceptorPipeline 包裹 RPC 调用。

- 每个方法体结构统一：`run_pre → 调用下游 RPC → run_post → 返回结果`
- `InterceptorPipeline` 通过 Gateway 启动时配置注入

#### Scenario: GetUser 请求经过完整拦截链

- **WHEN** 前端发送 GetUser gRPC-Web 请求
- **THEN** 请求依次经过 LogInterceptor(pre) → 调用 svc-user → LogInterceptor(post)
