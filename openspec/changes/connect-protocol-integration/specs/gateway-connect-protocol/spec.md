## ADDED Requirements

### Requirement: Gateway 支持 gRPC-Web 协议

Gateway SHALL 通过 `tonic-web` Tower Layer 支持 gRPC-Web 协议，使前端能够通过 HTTP 调用 gRPC 服务：

- Gateway 实现 `UserService` gRPC trait（作为 BFF 层）
- 内部通过 Tonic gRPC 客户端调用 svc-user 微服务
- `tonic-web::GrpcWebLayer` 处理 gRPC-Web ↔ gRPC 协议转换
- Gateway 同时支持 gRPC-Web（前端调用）和标准 gRPC（微服务间调用）

#### Scenario: 前端 gRPC-Web 请求成功处理

- **WHEN** 前端通过 `createGrpcWebTransport` 发送 `GetUser` gRPC-Web 请求到 Gateway
- **THEN** Gateway 解码 gRPC-Web 请求，通过 gRPC 客户端调用 svc-user，返回 gRPC-Web 格式的响应

#### Scenario: CORS 支持

- **WHEN** 前端从不同端口（如 localhost:5173）发送 gRPC-Web 请求
- **THEN** Gateway 返回正确的 CORS headers，允许跨域请求

### Requirement: Gateway BFF 代理模式

Gateway SHALL 作为 BFF（Backend for Frontend）层，实现各微服务的 gRPC Service trait：

- 每个 Service trait 的实现内部调用对应微服务的 gRPC 客户端
- Gateway 层可添加横切逻辑（认证、限流、日志、错误转换）
- 前端只与 Gateway 通信，不直接调用微服务

```rust
// Gateway 实现 UserService trait
#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(&self, request: Request<GetUserRequest>) -> Result<Response<GetUserResponse>, Status> {
        // 内部调用 svc-user gRPC 客户端
        let mut client = UserServiceClient::connect(self.svc_user_url.clone()).await?;
        client.get_user(request).await
    }
}
```

#### Scenario: Gateway 转发 GetUser 请求

- **WHEN** Gateway 收到 `GetUser` gRPC-Web 请求
- **THEN** Gateway 内部调用 svc-user 的 gRPC 端点，返回用户信息

#### Scenario: svc-user 不可用时返回错误

- **WHEN** svc-user 未启动或不可达
- **THEN** Gateway 返回 gRPC Status `UNAVAILABLE`，前端 Connect 客户端将其转换为 `ConnectError`

### Requirement: 保留 REST 健康检查端点

Gateway SHALL 保留 REST 格式的健康检查端点：

- `GET /health` 返回 JSON 格式的健康状态
- 该端点不走 gRPC-Web 协议，保持原有行为

#### Scenario: 健康检查正常响应

- **WHEN** 发送 `GET /health` 请求到 Gateway
- **THEN** 返回 `200 OK`，body 为 JSON 格式 `{ "status": "ok", ... }`
