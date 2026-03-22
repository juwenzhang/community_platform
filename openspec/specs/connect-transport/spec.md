### Requirement: gRPC-Web Transport 配置

前端 SHALL 使用 `@connectrpc/connect-web` 的 `createGrpcWebTransport` 创建 Transport，配置如下：
- `baseUrl` 使用相对路径 `/`（通过 Vite proxy 或 Nginx 反代到 Gateway）
- 不硬编码任何环境地址

Transport 实例 SHALL 在 `apps/main/src/lib/connect.ts` 中统一导出，供全应用使用。

#### Scenario: Transport 使用相对路径

- **WHEN** 前端应用在开发环境启动
- **THEN** gRPC-Web 请求通过 Vite dev server proxy 转发到 Gateway（localhost:8000）

#### Scenario: Transport 环境无关

- **WHEN** 构建后的前端应用部署到生产环境
- **THEN** gRPC-Web 请求通过 Nginx/Ingress 反代到 Gateway，无需修改代码或配置

### Requirement: 类型安全的 RPC 客户端调用

前端 SHALL 使用 `@connectrpc/connect` 的 `createClient` 函数，结合 `@luhanxin/shared-types` 生成的 Service 描述符创建类型安全的客户端：

```typescript
import { createClient } from '@connectrpc/connect';
import { UserService } from '@luhanxin/shared-types';
import { transport } from '@/lib/connect';

const client = createClient(UserService, transport);
const res = await client.getUser({ userId: '123' });
// res.user 类型为 User | undefined，完整类型推断
```

#### Scenario: 编译时类型检查

- **WHEN** 开发者调用 `client.getUser({ userId: '123' })`
- **THEN** TypeScript 编译器确保参数类型为 `GetUserRequest`，返回值类型为 `GetUserResponse`，IDE 提供完整自动补全

#### Scenario: 不允许手写接口类型

- **WHEN** 前端代码需要引用 RPC 请求/响应类型
- **THEN** MUST 从 `@luhanxin/shared-types` 导入 proto 生成的类型，不允许手写重复定义

### Requirement: Vite Proxy 路由适配

Vite dev server 的 proxy 配置 SHALL 支持 gRPC-Web 请求路径格式（`/<package>.<Service>/<Method>`）：

- 匹配 `/luhanxin.community.v1` 前缀的请求转发到 Gateway
- 保留 `/api` 前缀转发规则（用于 REST 端点如文件上传、health check）

#### Scenario: gRPC-Web 请求代理

- **WHEN** 前端发起 gRPC-Web 请求到 `/luhanxin.community.v1.UserService/GetUser`
- **THEN** Vite dev server 将请求代理到 `http://localhost:8000/luhanxin.community.v1.UserService/GetUser`

#### Scenario: REST 请求代理不受影响

- **WHEN** 前端发起 REST 请求到 `/api/v1/...`
- **THEN** Vite dev server 仍将请求代理到 `http://localhost:8000/api/v1/...`
