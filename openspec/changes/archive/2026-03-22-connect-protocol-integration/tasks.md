## 1. Gateway 后端改造（gRPC-Web 支持）

- [x] 1.1 添加 `tonic-web` 依赖到 Gateway 的 `Cargo.toml`
- [x] 1.2 实现 `GatewayUserService` struct，实现 `UserService` gRPC trait（内部调用 svc-user gRPC 客户端）
- [x] 1.3 重构 Gateway `main.rs`：用 Tonic Router + `GrpcWebLayer` 替代手动 Axum 路由，保留 `/health` REST 端点
- [x] 1.4 验证 Gateway 启动成功，`/health` 端点正常响应

## 2. 前端 Transport 与 Proxy 配置

- [x] 2.1 修改 `apps/main/src/lib/connect.ts`：从 `createConnectTransport` 改为 `createGrpcWebTransport`，`baseUrl` 改为 `/`
- [x] 2.2 更新 `apps/main/vite.config.ts` proxy 规则：增加 `/luhanxin.community.v1` 前缀转发，保留 `/api` 转发

## 3. Demo 页面升级（ApiTester 组件）

- [x] 3.1 重写 `ApiTester.tsx`：删除手写 `UserInfo` 接口，改用 `createClient(UserService, transport)` + `@luhanxin/shared-types` 类型进行 RPC 调用
- [x] 3.2 更新错误处理：从 HTTP 错误码改为 `ConnectError` 处理，展示 gRPC status code
- [x] 3.3 更新 UI 展示：链路描述更新为 gRPC-Web 链路，响应字段使用 camelCase（与 proto 生成类型一致）

## 4. 端到端验证

- [x] 4.1 启动全栈（`make dev-full`），验证 Demo 页面通过 gRPC-Web 成功调用 GetUser 并正确渲染用户信息
- [x] 4.2 验证浏览器 Network 面板中请求 Content-Type 为 `application/grpc-web+proto`
- [x] 4.3 验证 svc-user 停止时，前端正确显示 ConnectError 错误提示
