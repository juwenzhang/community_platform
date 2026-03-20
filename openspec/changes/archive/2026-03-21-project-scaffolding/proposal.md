## Why

当前项目仅有设计文档和技术调研，**没有一行可运行的代码**。所有技术决策（Rust 微服务、Garfish 微前端、Protobuf 交互、pnpm Monorepo）都停留在纸面上，需要通过项目骨架初始化将其落地为可执行的工程结构，为后续 MVP 功能开发奠定基础。

现在是启动开发的最佳时机——设计文档已完成 Review、技术选型已确认（Protobuf 替代 JSON、Connect Protocol、buf 工具链），下一步就是让代码跑起来。

> 📎 相关设计文档：
> - `docs/design/2026-03-20/01-tech-overview.md` — 整体架构与技术栈
> - `docs/design/2026-03-20/02-frontend-architecture.md` — 前端 Monorepo + Garfish 微前端
> - `docs/design/2026-03-20/03-backend-architecture.md` — Rust 微服务架构
> - `docs/design/2026-03-20/05-infrastructure.md` — Docker Compose + 监控

## What Changes

### 新增：Protobuf 定义与代码生成管道
- 创建 `proto/` 目录，定义核心 `.proto` 文件（`common.proto`, `user.proto`, `article.proto`）
- 配置 `buf.yaml` + `buf.gen.yaml`，实现 `buf generate` 一键生成 Rust (prost) + TypeScript (protobuf-es) 代码
- 建立前后端共享类型的 Single Source of Truth

### 新增：Rust 后端 Workspace
- 创建 `services/` 下的 Cargo workspace：`gateway`、`svc-user`、`shared`
- Gateway：Axum HTTP 服务 + 路由骨架 + 健康检查端点
- svc-user：Tonic gRPC 服务骨架
- shared：公共 crate（proto 生成代码、错误类型、配置加载）

### 新增：前端 pnpm Monorepo
- 创建根 `pnpm-workspace.yaml` + 根 `package.json`
- `apps/main/`：Garfish 主应用骨架（React + Vite + 路由 + 布局）
- `apps/feed/`：Feed 子应用骨架（React + Vite，作为第一个微前端子应用验证 Garfish 接入）
- `packages/shared-types/`：存放 protobuf-es 生成的 TypeScript 类型

### 新增：Docker 开发环境
- `docker/docker-compose.yml`：PostgreSQL 16 + Redis 7 + Meilisearch
- `docker/.env.example`：环境变量模板

### 新增：工程化配置
- 根目录 `Makefile` / `justfile`：常用开发命令（`buf generate`、`cargo build`、`pnpm dev`、`docker compose up`）
- `.gitignore`：覆盖 Rust / Node.js / Proto 生成物
- Biome 配置（前端 lint + format）
- 根 `README.md`：快速启动指南

### 验收目标：端到端 Hello World
- 前端（main 应用）→ Connect Protocol → Gateway → gRPC → svc-user → 返回响应
- 证明整条 Protobuf 链路通畅

## Capabilities

### New Capabilities

- `proto-schema`: Protobuf schema 定义与 buf 代码生成管道（`proto/` 目录、buf 配置、生成脚本）
- `backend-workspace`: Rust 后端 workspace 骨架（Gateway + svc-user + shared crate + 配置加载 + 健康检查）
- `frontend-monorepo`: 前端 pnpm Monorepo 骨架（Garfish 主应用 + Feed 子应用 + shared-types 包）
- `dev-environment`: Docker Compose 开发环境 + 工程化配置（Makefile、.gitignore、Biome、README）
- `e2e-hello-world`: 端到端验证——前端通过 Connect Protocol 调用后端 gRPC 服务并返回响应

### Modified Capabilities

（无——这是全新项目，尚无已有的 specs）

## Impact

### 新增目录与文件
```
proto/                          # 新增：Protobuf 定义
services/                       # 新增：Rust 后端 workspace
apps/                           # 新增：前端子应用
packages/                       # 新增：前端共享包
docker/                         # 新增：Docker 配置
```

### 依赖引入
- **Rust crates**: axum, tonic, prost, prost-types, sea-orm, serde, tokio, tower, tracing
- **npm packages**: react, react-dom, vite, @garfish/bridge-react-v18, @connectrpc/connect-web, @bufbuild/protobuf, zustand, tailwindcss, antd, biome
- **工具链**: buf (Protobuf)、pnpm、cargo、docker compose

### 对后续开发的影响
- Proto 定义确立后，后续所有 API 开发都基于 `.proto` 文件驱动
- Monorepo 结构确立后，后续子应用/微服务按相同模式添加
- Docker 环境确立后，所有开发者 `docker compose up` 即可启动完整基础设施
