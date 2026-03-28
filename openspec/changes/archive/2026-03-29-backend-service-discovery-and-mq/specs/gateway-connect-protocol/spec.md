## MODIFIED Requirements

### Requirement: Gateway BFF 代理模式

Gateway SHALL 作为 BFF（Backend for Frontend）层，实现各微服务的 gRPC Service trait：

- 每个 Service trait 的实现内部调用对应微服务的 gRPC 客户端
- Gateway 层可添加横切逻辑（认证、限流、日志、错误转换）
- 前端只与 Gateway 通信，不直接调用微服务
- **变更**: 微服务地址通过 `ServiceResolver` 从 Consul 动态解析，不再依赖硬编码环境变量。当 Consul 不可达时 fallback 到环境变量。

```rust
// Gateway 使用 ServiceResolver 解析服务地址
#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(&self, request: Request<GetUserRequest>) -> Result<Response<GetUserResponse>, Status> {
        // 从 Consul 动态解析 svc-user 地址
        let instance = self.resolver.resolve("svc-user").await?;
        let url = format!("http://{}:{}", instance.address, instance.port);
        let mut client = UserServiceClient::connect(url).await?;
        client.get_user(request).await
    }
}
```

#### Scenario: Gateway 通过 Consul 转发 GetUser 请求

- **WHEN** Gateway 收到 `GetUser` gRPC-Web 请求
- **THEN** Gateway 从 Consul 解析 svc-user 地址，调用其 gRPC 端点，返回用户信息

#### Scenario: svc-user 不可用时返回错误并入队重试

- **WHEN** svc-user 未启动或不可达
- **THEN** Gateway 返回 gRPC Status `UNAVAILABLE`，同时将请求写入 NATS 重试队列

#### Scenario: Consul 不可达时使用 fallback 地址

- **WHEN** Consul 不可达但 `SVC_USER_URL` 环境变量已设置
- **THEN** Gateway 使用环境变量地址转发请求
