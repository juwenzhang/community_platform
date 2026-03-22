## Why

当前项目虽然已经搭建了 Connect Protocol 的基础设施（`@connectrpc/connect-web` 依赖已安装、`connect.ts` transport 已定义、`shared-types` 已通过 buf 生成了 TypeScript 类型），但前端实际调用后端 API 时仍使用原始 `fetch` + 手写 JSON 接口类型。这导致：

1. **类型不安全**：`ApiTester.tsx` 手写了 `UserInfo` 接口（snake_case），与 proto 生成的 `User` 类型（camelCase）不一致，proto 生成的类型完全没被使用
2. **Connect Transport 空置**：`apps/main/src/lib/connect.ts` 导出的 `transport` 没有任何消费者
3. **`@luhanxin/shared-types` 虚设**：包已在 `package.json` 声明依赖但没有 import
4. **Gateway 不支持 Connect Protocol**：当前 Gateway 只是普通的 Axum REST API（手动 JSON 序列化），无法处理 Connect 格式的请求
5. **connect.ts 的 `baseUrl` 硬编码**：写死 `http://localhost:8000`，绕过了 Vite proxy，不适配生产环境

现在是最佳修复时机——项目处于早期阶段，只有一个 Demo 页面在调 API，改动面可控。

## What Changes

- **修复 `connect.ts`**：`baseUrl` 从硬编码 `http://localhost:8000` 改为相对路径（走 Vite proxy / Nginx 反代）
- **Gateway 支持 Connect Protocol**：Axum Gateway 增加对 Connect Protocol 请求格式的处理能力，使其能接收 Protobuf 编码的请求并返回 Protobuf 编码的响应
- **前端改用 Connect 客户端调用**：`ApiTester.tsx` 从 `fetch` + 手写类型改为 `createClient(UserService, transport)` + `shared-types` 生成的类型，实现端到端类型安全
- **删除手写类型定义**：移除 `ApiTester.tsx` 中的 `UserInfo` 手写接口，改用 proto 生成的 `User` 类型
- **验证全链路**：确保 `proto → buf generate → shared-types → connect client → Vite proxy → Gateway → gRPC → svc-user` 全链路 Protobuf 通信正常

## Non-goals（非目标）

- **不改动 proto 定义**：现有的 `user.proto`、`article.proto`、`common.proto` 不做变更
- **不改动 svc-user 微服务**：gRPC 服务端逻辑不变，只改 Gateway 层
- **不引入新的前端页面**：只升级现有 Demo 页面的调用方式
- **不做生产部署配置**：Nginx / K8s Ingress 的 Connect 协议代理配置不在本次范围内
- **不改动 feed 子应用**：feed 暂时不需要调 API，后续按需接入

## 与现有设计文档的关系

- **`docs/design/2026-03-20/01-tech-overview.md`**：技术总览中已明确前后端交互使用 Connect Protocol + Protobuf，本次变更是落地这一设计决策
- **`docs/tech/01-data-serialization-formats.md`**：数据序列化选型文档确认了 Protobuf 方案
- **`docs/tech/02-frontend-backend-protocols.md`**：前后端通信协议选型文档确认了 Connect Protocol 方案
- **`openspec/specs/e2e-hello-world/`**：当前 e2e 验证链路使用 JSON，本次升级为 Protobuf

## Capabilities

### New Capabilities

- `connect-transport`: 前端 Connect Transport 配置与客户端封装，提供类型安全的 RPC 调用能力
- `gateway-connect-protocol`: Gateway 层 Connect Protocol 支持，处理 Protobuf 编码的 HTTP 请求/响应

### Modified Capabilities

- `e2e-hello-world`: Demo 页面的 API 调用方式从 fetch + JSON 升级为 Connect 客户端 + Protobuf

## Impact

- **前端代码**：`apps/main/src/lib/connect.ts`（修复 baseUrl）、`apps/main/src/pages/demo/components/ApiTester.tsx`（重写为 Connect 调用）
- **后端代码**：`services/gateway/`（Axum 路由适配 Connect Protocol 请求格式）
- **依赖变更**：Gateway 可能需要增加 `tonic-web` 或自定义 Connect 协议适配中间件
- **API 格式**：`/api/v1/users/:id` REST 风格 → Connect Protocol 的 unary RPC 端点格式
- **测试**：现有 e2e 测试需要适配新的请求/响应格式
