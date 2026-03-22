## Context

当前项目已完成 E2E 验证链路的搭建（React → fetch → Vite Proxy → Axum Gateway → gRPC → svc-user），但前端仍使用原始 `fetch` + JSON，未利用已安装的 `@connectrpc/connect-web` 和 `@luhanxin/shared-types`。

**现有基础设施：**
- Proto 定义：`proto/luhanxin/community/v1/user.proto`（含 `UserService.GetUser`）
- TypeScript 类型：`packages/shared-types/` 已由 `protoc-gen-es` 生成（`User`、`GetUserRequest`、`UserService` 等）
- 前端依赖：`@connectrpc/connect` + `@connectrpc/connect-web` + `@bufbuild/protobuf` 已安装
- Transport：`apps/main/src/lib/connect.ts` 已定义但 baseUrl 硬编码且无人消费
- Gateway：Axum 手动路由 + JSON 序列化，不支持任何 RPC 协议格式

**核心矛盾：** 前端 Connect 客户端需要后端支持 Connect Protocol 或 gRPC-Web 协议，但当前 Gateway 只是普通 REST API。

## Goals / Non-Goals

**Goals:**
- Gateway 支持 gRPC-Web 协议，前端通过 `createGrpcWebTransport` 进行类型安全的 RPC 调用
- 前端 `ApiTester` Demo 页面完全使用 Connect 客户端 + shared-types 生成类型
- 建立可复用的前端 RPC 调用模式，供后续业务页面参考
- connect.ts 的 baseUrl 适配开发/生产环境

**Non-Goals:**
- 不实现 Connect Protocol 原生支持（Rust 生态暂无成熟的 Connect Protocol 服务端实现）
- 不改动 proto 定义和 svc-user 微服务
- 不处理生产部署的 Nginx/Ingress 配置
- 不引入新的业务功能

## Decisions

### Decision 1：使用 gRPC-Web 协议而非 Connect Protocol

**选择：** 前端使用 `createGrpcWebTransport`，Gateway 使用 `tonic-web` 层

**原因：**
- `@connectrpc/connect-web` 提供两种 Transport：
  - `createConnectTransport` — 需要后端实现 Connect Protocol（Rust 生态无成熟方案）
  - `createGrpcWebTransport` — 需要后端支持 gRPC-Web（`tonic-web` crate 直接提供）
- `tonic-web` 是 Tonic 官方维护的 Tower Layer，成熟度高、维护活跃
- 前端 API 完全一致（都是 `createClient(UserService, transport)` 调用），后续如需切换协议只需换 Transport 工厂函数

**替代方案（已排除）：**
- **Connect Protocol 自实现**：需要手写 Axum 中间件解析 Connect 请求格式，工作量大且无社区参考
- **保持 REST + JSON**：放弃类型安全和代码生成的优势，与项目规范冲突
- **Envoy sidecar 代理**：引入额外基础设施复杂度，开发环境过重

### Decision 2：Gateway 架构从 REST Proxy 变为 gRPC-Web Gateway

**选择：** Gateway 从"手动 Axum 路由 + JSON 序列化"改为"Tonic gRPC 服务 + tonic-web Layer"

**具体方案：**

```rust
// Gateway 直接暴露 gRPC 服务定义，由 tonic-web 处理协议转换
use tonic_web::GrpcWebLayer;

// 方案：Gateway 作为 gRPC-Web → gRPC 的透明代理
// 前端 gRPC-Web 请求 → tonic-web 解码 → 转发到 svc-user gRPC → 返回响应
```

**两种实现路径（推荐 B）：**

- **A. Gateway 自己实现 UserService trait**：Gateway 内部调用 svc-user 的 gRPC 客户端，自己作为 gRPC 服务端。优点是可以在 Gateway 层做聚合/转换，缺点是每加一个 RPC 方法都要在 Gateway 写一遍代理逻辑。
- **B. Gateway 作为 gRPC-Web 代理转发**：Gateway 接收 gRPC-Web 请求，实现 UserService trait，内部调用 svc-user gRPC 服务。这是标准的 BFF（Backend for Frontend）模式，Gateway 可以做认证、限流、聚合等横切逻辑。

选择 B——Gateway 实现 UserService trait 作为 BFF 层：
- 后续可在 Gateway 层统一处理认证、限流、日志
- 可以做跨服务聚合（一个前端 RPC 调用，Gateway 内部组合多个微服务结果）
- 保持 Gateway 作为唯一对外暴露的入口

### Decision 3：connect.ts baseUrl 使用相对路径

**选择：** `baseUrl` 从 `http://localhost:8000` 改为 `/`

```typescript
export const transport = createGrpcWebTransport({
  baseUrl: '/',
});
```

**原因：**
- 开发环境：Vite proxy 将 `/luhanxin.community.v1.UserService/GetUser` 转发到 Gateway
- 生产环境：Nginx/Ingress 做同样的反代
- 不硬编码任何环境地址，代码环境无关

### Decision 4：Vite proxy 规则调整

当前 proxy 只转发 `/api` 前缀：

```typescript
proxy: {
  '/api': { target: 'http://localhost:8000', changeOrigin: true },
}
```

gRPC-Web 的请求路径是 `/<package>.<Service>/<Method>`（如 `/luhanxin.community.v1.UserService/GetUser`），需要调整 proxy 规则：

```typescript
proxy: {
  '/luhanxin.community.v1': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
  // 保留 /api 用于未来可能的 REST 端点（文件上传等）
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| **Gateway 架构变更较大**：从 REST API 变为 gRPC 服务 | Gateway 目前只有一个 health check 和一个 get_user 端点，改动面可控。保留 health check 作为 REST 端点 |
| **tonic-web 新依赖**：引入 `tonic-web` crate | tonic-web 是 Tonic 官方包，维护活跃，风险低 |
| **gRPC-Web binary 格式调试不便**：浏览器 Network 面板看不到明文 | Connect-web 的 gRPC-Web Transport 默认使用二进制格式；可在开发环境通过 `useBinaryFormat: false` 切换 JSON（需 tonic 侧支持 JSON，但 gRPC-Web 标准不保证 JSON 支持）。实际开发可通过 Connect interceptor 做日志 |
| **Vite proxy 路径规则变化**：从 `/api` 变为包名前缀 | 同时保留 `/api` 规则，确保 REST 端点（文件上传、webhook）不受影响 |

## Open Questions

1. ~~是否需要保留原有的 `/api/v1/users/:id` REST 端点作为 fallback？~~ → **保留 health check REST 端点，用户查询改为纯 gRPC-Web**
2. 后续 feed 子应用接入 Connect 客户端时，是否需要在 `packages/` 下抽取共享 transport？ → 暂不处理，后续需要时再提升
