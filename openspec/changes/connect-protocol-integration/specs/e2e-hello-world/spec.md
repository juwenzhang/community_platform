## MODIFIED Requirements

### Requirement: 端到端请求链路

系统 SHALL 实现以下完整请求链路，验证所有技术组件正常工作：

```
前端 (React)
  → @connectrpc/connect-web (gRPC-Web Transport)
    → Vite Proxy / Nginx
      → Gateway (Axum + tonic-web, :8000)
        → gRPC-Web 解码 (tonic-web Layer)
          → Gateway UserService impl
            → gRPC Client 调用 svc-user (:50051)
              → GetUser RPC 返回 mock 数据
            ← GetUserResponse
          ← gRPC-Web 编码响应
        ← HTTP Response (gRPC-Web binary)
      ← Protobuf 解码为 TypeScript 类型
    → 页面渲染用户信息
```

#### Scenario: 前端成功调用后端并渲染

- **WHEN** 前端主应用启动，用户在 Demo 页面点击"发送请求"按钮
- **THEN** 页面显示从 svc-user 返回的 mock 用户信息（ID、用户名、显示名称、头像、简介），类型来自 `@luhanxin/shared-types` 的 `User`

#### Scenario: gRPC-Web 二进制传输验证

- **WHEN** 在浏览器 DevTools Network 面板中查看请求
- **THEN** 请求 Content-Type 为 `application/grpc-web+proto`，body 为二进制数据而非 JSON

### Requirement: Gateway 代理 gRPC 调用

Gateway SHALL 通过 tonic-web Layer 接收前端的 gRPC-Web 请求，内部通过 gRPC 客户端调用 svc-user：
- 接收路径：`POST /luhanxin.community.v1.UserService/GetUser`（gRPC-Web 标准路径格式）
- tonic-web Layer 自动解码 gRPC-Web 请求为标准 gRPC
- Gateway UserService impl 通过 Tonic client 调用 svc-user 的 gRPC 端点
- tonic-web Layer 自动编码 gRPC 响应为 gRPC-Web 格式返回给前端

#### Scenario: Gateway 代理转发成功

- **WHEN** 前端通过 Connect 客户端调用 `client.getUser({ userId: 'user-123' })`
- **THEN** Gateway 转发到 svc-user 并返回正确的 `GetUserResponse`

#### Scenario: svc-user 不可用时 Gateway 返回错误

- **WHEN** svc-user 未启动，前端发送请求到 Gateway
- **THEN** Gateway 返回 gRPC Status `UNAVAILABLE`，前端 Connect 客户端抛出 `ConnectError`，Demo 页面显示友好的错误提示

### Requirement: 前端 Connect Client 配置

前端 SHALL 使用 `@connectrpc/connect-web` 的 `createGrpcWebTransport` 配置 Transport：
- `baseUrl` 使用相对路径 `/`（通过 proxy 转发）
- 使用 `createGrpcWebTransport`（gRPC-Web 协议，兼容 tonic-web）
- 类型从 `@luhanxin/shared-types` 导入

#### Scenario: Connect Client 初始化

- **WHEN** 前端应用启动时
- **THEN** gRPC-Web Transport 已配置，可通过 `createClient(UserService, transport)` 调用 RPC 方法

#### Scenario: 类型安全保证

- **WHEN** 开发者调用 `client.getUser({ userId: '123' })`
- **THEN** TypeScript 编译器检查参数类型为 `GetUserRequest`，返回值类型为 `GetUserResponse`，IDE 有完整的自动补全
