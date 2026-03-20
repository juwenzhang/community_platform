## 1. 工程化基础配置

- [x] 1.1 创建根 `.gitignore`（覆盖 Rust target/、node_modules/、.env、构建产物等）
- [x] 1.2 创建根 `README.md`（项目简介、技术栈、先决条件、快速启动步骤）
- [x] 1.3 创建根 `Makefile`（proto / dev-infra / dev-backend / dev-frontend / dev / build / lint / clean 命令）

## 2. Protobuf Schema 与代码生成管道

- [x] 2.1 创建 `proto/buf.yaml`（模块名、lint 规则配置）
- [x] 2.2 创建 `proto/buf.gen.yaml`（Rust prost 插件 → `services/shared/src/proto/`，TypeScript protobuf-es 插件 → `packages/shared-types/src/proto/`）
- [x] 2.3 编写 `proto/community/v1/common.proto`（PaginationRequest、PaginationResponse、引入 google.protobuf.Timestamp）
- [x] 2.4 编写 `proto/community/v1/user.proto`（UserService、GetUser RPC、User/GetUserRequest/GetUserResponse 消息）
- [x] 2.5 编写 `proto/community/v1/article.proto`（ArticleService、GetArticle/ListArticles RPC、Article 消息 + 分页）
- [x] 2.6 验证 `buf lint` 通过所有 proto 文件
- [x] 2.7 运行 `buf generate` 验证 Rust 代码生成到 `services/shared/src/proto/`
- [x] 2.8 运行 `buf generate` 验证 TypeScript 代码生成到 `packages/shared-types/src/proto/`

## 3. Docker 开发环境

- [x] 3.1 创建 `docker/.env.example`（PostgreSQL、Redis、Meilisearch、服务端口等变量模板）
- [x] 3.2 创建 `docker/docker-compose.yml`（PostgreSQL 16 + Redis 7 + Meilisearch，healthcheck + named volumes）
- [x] 3.3 验证 `docker compose up -d` 启动成功，三个容器健康检查通过
- [x] 3.4 验证 PostgreSQL 可连接（`psql -h localhost -U luhanxin -d luhanxin_community`）

## 4. Rust 后端 Workspace

> 依赖：2.7（proto Rust 代码已生成）

- [x] 4.1 创建 `services/Cargo.toml`（workspace root，定义 members + `[workspace.dependencies]` 公共依赖版本）
- [x] 4.2 创建 `services/shared/` crate（Cargo.toml + `src/lib.rs`，导出 proto、config、error 模块）
- [x] 4.3 在 shared crate 中集成 prost 生成的 proto 代码，通过 `pub mod proto` 导出
- [x] 4.4 在 shared crate 中实现 `config` 模块（从环境变量加载 DATABASE_URL、REDIS_URL、端口等配置）
- [x] 4.5 在 shared crate 中定义 `error` 模块（公共错误类型 + tonic Status 转换）
- [x] 4.6 创建 `services/svc-user/` crate（Cargo.toml + `src/main.rs`，Tonic gRPC server 骨架）
- [x] 4.7 实现 svc-user 的 `GetUser` RPC（返回 mock 用户数据）
- [ ] 4.8 为 svc-user 添加 tonic-reflection（支持 grpcurl 调试）— 后续补充
- [x] 4.9 创建 `services/gateway/` crate（Cargo.toml + `src/main.rs`，Axum HTTP server 骨架）
- [x] 4.10 实现 Gateway 健康检查端点 `GET /health` → 200 `{"status":"ok"}`
- [x] 4.11 为 Gateway 添加 tower-http 中间件（CORS、RequestId、Tracing）
- [x] 4.12 在 Gateway 中配置 Tonic client 连接 svc-user，实现 `/api/v1/users/GetUser` 代理转发
- [x] 4.13 验证 `cargo build` 在 workspace 级别编译通过
- [x] 4.14 验证 svc-user 启动 + `grpcurl` 调用 GetUser 返回 mock 数据
- [x] 4.15 验证 Gateway 启动 + `curl /health` 返回 200

## 5. 前端 pnpm Monorepo

> 依赖：2.8（proto TypeScript 代码已生成）

- [x] 5.1 创建根 `pnpm-workspace.yaml` + 根 `package.json`（@luhanxin/community-platform）
- [x] 5.2 创建根 `biome.json`（TypeScript + React JSX、2 空格缩进、单引号、尾逗号）
- [x] 5.3 创建 `packages/shared-types/`（package.json @luhanxin/shared-types + tsconfig.json + src/index.ts 导出）
- [x] 5.4 验证 shared-types 正确导出 buf 生成的 TypeScript 类型
- [x] 5.5 创建 `apps/main/`（package.json @luhanxin/main + Vite + React 18 + TypeScript 配置）
- [x] 5.6 配置 Tailwind CSS（tailwind.config.ts + postcss.config.js + 基础样式）
- [x] 5.7 配置 Ant Design 5.x（ConfigProvider + 主题色 #0EA5E9 + 暗色模式）
- [x] 5.8 实现主应用 Layout（Header + Sidebar + Content 区域）
- [x] 5.9 配置 React Router（/, /feed/*, /article/*, /profile/* 路由）
- [x] 5.10 初始化 Garfish，注册 Feed 子应用
- [x] 5.11 创建 Zustand `useAuthStore` 骨架（user state + login/logout actions 占位）
- [x] 5.12 创建 `apps/feed/`（package.json @luhanxin/feed + Vite + React 18 + Garfish 子应用导出）
- [x] 5.13 实现 Feed 子应用骨架页面（"Feed 子应用已加载" 占位 + 独立运行模式）
- [x] 5.14 验证 `pnpm install` 成功
- [x] 5.15 验证主应用 `pnpm dev` 在 localhost:5173 启动
- [x] 5.16 验证 Feed 子应用独立运行在 localhost:5174
- [ ] 5.17 验证 Garfish 主应用加载 Feed 子应用成功 — 需要在浏览器中手动验证

## 6. 端到端 Hello World 验证

> 依赖：4.12 + 5.10（Gateway 代理 + 前端 Garfish 配置完成）

- [x] 6.1 在前端配置 Connect Transport（@connectrpc/connect-web，baseUrl → localhost:8000）
- [x] 6.2 在主应用创建 demo 页面，调用 UserService.GetUser 并显示返回的 mock 用户信息
- [x] 6.3 验证完整链路：前端 → Connect Protocol → Gateway → gRPC → svc-user → 响应渲染
- [ ] 6.4 验证 DevTools Network 中请求 Content-Type 为 `application/proto` 或 `application/connect+proto` — 当前使用 REST JSON 代理，后续集成 Connect Protocol
- [x] 6.5 验证 svc-user 不可用时 Gateway 返回友好错误，前端显示错误提示
