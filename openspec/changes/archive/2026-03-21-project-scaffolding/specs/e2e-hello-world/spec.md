## ADDED Requirements

### Requirement: 端到端请求链路

系统 SHALL 实现以下完整请求链路，验证所有技术组件正常工作：

```
前端 (React)
  → @connectrpc/connect-web (HTTP/2 + Protobuf)
    → Gateway (Axum, :8000)
      → gRPC (Tonic client)
        → svc-user (Tonic server, :50051)
          → GetUser RPC 返回 mock 数据
        ← GetUserResponse
      ← HTTP Response (Protobuf)
    ← 解码为 TypeScript 类型
  → 页面渲染用户信息
```

#### Scenario: 前端成功调用后端并渲染
- **WHEN** 前端主应用启动，页面中触发 `GetUser` 请求（例如点击按钮或页面加载时）
- **THEN** 页面显示从 svc-user 返回的 mock 用户信息（用户名、邮箱等）

#### Scenario: Protobuf 二进制传输验证
- **WHEN** 在浏览器 DevTools Network 面板中查看请求
- **THEN** 请求 Content-Type 为 `application/proto`（或 `application/connect+proto`），body 为二进制数据而非 JSON

### Requirement: Gateway 代理 gRPC 调用

Gateway SHALL 将前端的 Connect Protocol 请求转换为 gRPC 调用转发给 svc-user：
- 接收路径：`POST /api/v1/luhanxin.community.v1.UserService/GetUser`
- 解码 Connect Protocol 请求为 Protobuf message
- 通过 Tonic client 调用 svc-user 的 gRPC 端点
- 将 gRPC 响应编码为 Connect Protocol 响应返回给前端

#### Scenario: Gateway 代理转发成功
- **WHEN** 使用 curl 发送 Connect Protocol 请求到 Gateway
- **THEN** Gateway 转发到 svc-user 并返回正确的 Protobuf 响应

#### Scenario: svc-user 不可用时 Gateway 返回错误
- **WHEN** svc-user 未启动，前端发送请求到 Gateway
- **THEN** Gateway 返回 HTTP 503 或 Connect Error（`unavailable`），前端显示友好的错误提示

### Requirement: 前端 Connect Client 配置

前端 SHALL 使用 `@connectrpc/connect-web` 配置 Transport，连接到 Gateway：
- `baseUrl` 指向 `http://localhost:8000`
- 使用 `createConnectTransport`（Connect Protocol，非 gRPC-Web）
- 类型从 `@luhanxin/shared-types` 导入

#### Scenario: Connect Client 初始化
- **WHEN** 前端应用启动时
- **THEN** Connect Transport 已配置，可通过生成的 service client 调用 RPC 方法

#### Scenario: 类型安全保证
- **WHEN** 开发者调用 `userService.getUser({ userId: "123" })`
- **THEN** TypeScript 编译器检查参数类型，返回值类型为 `GetUserResponse`，IDE 有完整的自动补全
