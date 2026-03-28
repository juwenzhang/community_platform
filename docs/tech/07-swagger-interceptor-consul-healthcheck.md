# Swagger 集成、拦截器统一与 Consul 健康检查 — 踩坑与解决思路

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · Swagger · gRPC · Consul · Docker · 健康检查 · 拦截器

---

## 1. 问题背景

Gateway 已完成 gRPC-Web + InterceptorPipeline + Consul 服务发现的基础架构。本轮迭代需要解决三个问题：

1. **Swagger UI 只展示了 REST 端点，gRPC 方法没有文档**
2. **REST proxy 与 gRPC 原生路径的拦截逻辑重复**
3. **Consul 健康检查始终红色（critical），但服务本身可正常调用**

---

## 2. 问题一：gRPC 方法未集成到 Swagger

### 现象

Swagger UI (`/swagger-ui/`) 只展示了 `GET /health`，没有 UserService 等 gRPC 方法。

### 根因

`utoipa` 的 `#[utoipa::path]` 宏只能标注 axum handler，而 gRPC 方法通过 `tonic` 的 `#[tonic::async_trait]` 实现，不是 axum handler。

### 方案对比

| 方案 | 做法 | 评价 |
|------|------|------|
| A. REST proxy | 为每个 gRPC 方法创建 axum handler，标注 `#[utoipa::path]` | ✅ 可测试、前端可参考 |
| B. 纯文档 | 在 OpenAPI spec 中手动定义 path，不注册路由 | 不可测试 |

**选择方案 A**：在 `gateway/src/routes/user/mod.rs` 创建 REST proxy handler。

### 关键设计

```
REST proxy handler 职责：
1. 定义 Swagger DTO（Serialize + ToSchema），映射 Proto 消息
2. 标注 #[utoipa::path]，注册到 OpenAPI
3. 内部调用 GatewayUserService（复用拦截器逻辑）
4. Proto Response → JSON DTO 转换
5. tonic Status → HTTP Status Code 映射
```

### Proto → DTO 映射表

| Proto 类型 | Swagger DTO | 说明 |
|-----------|-------------|------|
| `User` | `UserDto` | 时间戳转 ISO 8601 字符串 |
| `GetUserResponse` | `GetUserDto` | `user` 字段可选 |
| `tonic::Status` | `ApiError` | `code` + `message` |

### gRPC Status → HTTP Status 映射

```rust
tonic::Code::NotFound        → 404 NOT_FOUND
tonic::Code::Unavailable     → 503 SERVICE_UNAVAILABLE
tonic::Code::InvalidArgument → 400 BAD_REQUEST
tonic::Code::Unauthenticated → 401 UNAUTHORIZED
tonic::Code::PermissionDenied→ 403 FORBIDDEN
tonic::Code::DeadlineExceeded→ 504 GATEWAY_TIMEOUT
tonic::Code::ResourceExhausted→429 TOO_MANY_REQUESTS
_                            → 500 INTERNAL_SERVER_ERROR
```

---

## 3. 问题二：REST proxy 绕过拦截器

### 现象

REST proxy handler 直接调用 `ServiceResolver` + `UserServiceClient`，完全绕过了 `InterceptorPipeline`。意味着日志、认证、限流、重试等横切逻辑对 REST 路径不生效。

### 演进过程（三个阶段）

#### 阶段 1：独立实现（❌ 重复代码）

```
REST handler: 手动调 pipeline.run_pre → resolver → gRPC client → pipeline.run_post
gRPC service: 手动调 pipeline.run_pre → resolver → gRPC client → pipeline.run_post
```

两份几乎相同的代码，每加一个方法要改两个地方。

#### 阶段 2：注入 Pipeline（❌ 仍然重复）

REST handler 接收 `RestProxyState { resolver, pipeline }` 作为 State，在 handler 内执行拦截器。需要 `headers_to_metadata()` 将 axum `HeaderMap` 转为 tonic `MetadataMap`。

虽然拦截器生效了，但核心调用逻辑仍然是两份。

#### 阶段 3：复用 GatewayUserService（✅ 零重复）

```rust
// REST handler 直接调用 GatewayUserService
pub async fn get_user(
    State(svc): State<GatewayUserService>,
    headers: axum::http::HeaderMap,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let mut request = GetUserRequest { user_id }.into_request();
    *request.metadata_mut() = MetadataMap::from_headers(headers);

    // 拦截器 + resolver + gRPC 全在 GatewayUserService 里
    match svc.get_user(request).await { ... }
}
```

**关键洞察**：`GatewayUserService` 实现了 `UserService` trait，本身就是一个完整的"拦截 → 转发 → 拦截"闭环。REST handler 只需要做 JSON ↔ Proto 转换。

### 核心技巧：HeaderMap → MetadataMap

tonic 的 `MetadataMap` 底层就是 `http::HeaderMap`，可以零成本转换：

```rust
*request.metadata_mut() = MetadataMap::from_headers(headers);
```

这样认证 token、trace ID 等 HTTP headers 会完整传递给拦截器。

---

## 4. 问题三：Consul 健康检查红色

这是本轮最复杂的问题，涉及 Docker 网络、gRPC Health Protocol、自动探测三个层面。

### 4.1 问题拆解

Consul 健康检查失败有**两个独立原因**，必须同时解决：

| 原因 | 层面 | 现象 |
|------|------|------|
| 网络不可达 | Docker 网络 | Consul 容器连不上宿主机的 `127.0.0.1:50051` |
| 缺少 Health Protocol | gRPC 协议 | 即使网络通了，也没有实现标准健康检查接口 |

### 4.2 原因一：Docker 网络隔离

```
┌────────────────────────────┐
│  Docker Container (Consul) │
│                            │
│  health check → 127.0.0.1:50051  ← 这是容器自己的 localhost！
│                  ↓ FAIL            容器内没有 svc-user
└────────────────────────────┘

┌────────────────────────────┐
│  macOS Host                │
│  svc-user → 0.0.0.0:50051 │  ← 服务在这里
└────────────────────────────┘
```

**正确做法**：健康检查地址应为 `host.docker.internal:50051`（Docker Desktop 提供的宿主机别名）。

### 4.3 原因二：缺少 gRPC Health Checking Protocol

Consul 的 gRPC 类型健康检查遵循 [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)，需要服务实现 `grpc.health.v1.Health/Check` 方法。

**解决**：使用 `tonic-health` crate（3 行代码）：

```rust
let (health_reporter, health_service) = tonic_health::server::health_reporter();
health_reporter.set_serving::<UserServiceServer<UserServiceImpl>>().await;

Server::builder()
    .add_service(health_service)  // 注册 Health Service
    .add_service(UserServiceServer::new(user_service))
```

### 4.4 自动探测 Consul 是否在 Docker 内

#### 探测方案演进

| 方案 | 做法 | 结果 |
|------|------|------|
| v1: 硬编码 | 始终用 `host.docker.internal` | ❌ Consul 不在 Docker 时不适用 |
| v2: DNS 探测 | 在宿主机解析 `host.docker.internal` | ❌ macOS 宿主机上解析不了这个域名 |
| v3: Consul API 探测 | 调 `/v1/agent/self`，检查 NodeName | ✅ 正确且通用 |

#### 最终方案：NodeName 容器 ID 检测

Docker 容器的 hostname 默认是容器 ID 的前 12 位（十六进制），如 `1c4ebe56271a`。Consul 在 `-dev` 模式下 NodeName 等于 hostname。

```rust
/// 判断字符串是否像 Docker 容器 ID（12 位十六进制）
fn looks_like_container_id(s: &str) -> bool {
    s.len() == 12 && s.chars().all(|c| c.is_ascii_hexdigit())
}
```

#### 完整探测流程

```
resolve_check_host(address, consul_url)
  │
  ├─ 1. CONSUL_CHECK_HOST 环境变量？ → 直接用（最高优先级）
  │
  ├─ 2. GET /v1/agent/self → NodeName 是 12 位 hex？
  │     ├─ ✅ "1c4ebe56271a" → Consul 在容器里 → "host.docker.internal"
  │     └─ ❌ "my-laptop"    → Consul 在本地    → 用 address
  │
  └─ 3. API 请求失败 → 兜底用 address
```

#### 各环境适配表

| 环境 | NodeName | 探测结果 | 健康检查地址 |
|------|---------|---------|-------------|
| macOS + Docker Desktop | `1c4ebe56271a` | 容器 ID | `host.docker.internal:50051` |
| Linux 直接跑 Consul | `my-server` | 非容器 | `127.0.0.1:50051` |
| K8s Pod 网络 | `consul-0` | 非容器 | Pod IP |
| 用户手动设置 | — | 跳过探测 | `CONSUL_CHECK_HOST` 的值 |

---

## 5. 架构图：请求链路全景

```
┌─────────────────────────────────────────────────────────────┐
│                        Gateway :8000                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  gRPC Router │  │  REST Proxy      │  │  Swagger UI  │  │
│  │  (tonic-web) │  │  (axum handler)  │  │  /swagger-ui │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────┘  │
│         │                   │                               │
│         └───────┬───────────┘                               │
│                 ▼                                            │
│  ┌──────────────────────────┐                               │
│  │   GatewayUserService     │  ← 唯一的调用逻辑             │
│  │   InterceptorPipeline    │     （拦截器 → resolver → gRPC）│
│  │   ServiceResolver        │                               │
│  └─────────────┬────────────┘                               │
└────────────────┼────────────────────────────────────────────┘
                 │ gRPC
                 ▼
┌────────────────────────────┐
│  svc-user :50051           │
│  ├─ UserService (业务)     │
│  └─ Health Service (探活)  │  ← tonic-health
│                            │
│  Consul 注册:              │
│    address: 127.0.0.1      │  ← 其他服务连接用
│    check:   host.docker.   │  ← Consul 容器探活用
│             internal:50051 │
└────────────────────────────┘
```

---

## 6. 关键知识点

### 6.1 tonic MetadataMap 与 http HeaderMap 的关系

`tonic::metadata::MetadataMap` 底层就是 `http::HeaderMap`，可以通过 `from_headers()` 零拷贝转换。这让 REST proxy 能将 HTTP headers（如 `Authorization`、`X-Request-Id`）原样传递给 gRPC 拦截器。

### 6.2 utoipa 的限制

`utoipa` 只能标注 axum handler function（需要 `#[utoipa::path]` 宏），无法直接标注 tonic gRPC service method。如果要在 Swagger 中展示 gRPC 方法，必须创建对应的 axum handler 作为 proxy 或纯文档入口。

### 6.3 Docker `host.docker.internal`

- **只在 Docker 容器内部可用**，宿主机上 DNS 解析不了
- macOS Docker Desktop 和 Windows Docker Desktop 都支持
- Linux Docker 需要在 `docker run` 时加 `--add-host=host.docker.internal:host-gateway`
- K8s 环境中不存在，Pod 间通过 Service Name / Pod IP 通信

### 6.4 gRPC Health Checking Protocol

标准协议：`grpc.health.v1.Health/Check`。tonic 生态通过 `tonic-health` crate 提供开箱即用实现：

```rust
let (reporter, service) = tonic_health::server::health_reporter();
reporter.set_serving::<MyServiceServer<MyImpl>>().await;
server.add_service(service);
```

Consul 的 gRPC 健康检查类型会调用此接口。如果服务没有实现，Consul 会报错。

---

## 7. 决策总结（ADR 表）

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| Swagger 集成方式 | REST proxy / 纯文档 | REST proxy | 可在 Swagger UI 直接测试，前端可参考 |
| REST proxy 拦截器 | 独立实现 / 复用 GatewayUserService | 复用 | DRY，核心逻辑只维护一份 |
| 健康检查协议 | HTTP check / gRPC Health | gRPC Health | 标准协议，tonic-health 3 行代码 |
| Docker 环境探测 | DNS 探测 / Consul API 探测 / 环境变量 | Consul API + 环境变量兜底 | DNS 在宿主机侧不可用，API 探测准确 |

---

## 8. 参考资料

- [utoipa — Rust OpenAPI 文档生成](https://github.com/juhaku/utoipa)
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [tonic-health crate](https://docs.rs/tonic-health)
- [Docker host.docker.internal](https://docs.docker.com/desktop/features/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host)
- [Consul Health Checks — gRPC](https://developer.hashicorp.com/consul/docs/services/usage/checks#grpc-checks)
