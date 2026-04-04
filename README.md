<p align="center">
  <h1 align="center">🏗️ Luhanxin Community Platform</h1>
  <p align="center">
    面向开发者的编程社区平台 — 基于 Rust 微服务 + React/Vue 微前端的全栈架构
  </p>
  <p align="center">
    <a href="./README.en.md">English</a> | 中文
  </p>
  <p align="center">
    <a href="#-快速启动">快速启动</a> •
    <a href="#-项目结构">项目结构</a> •
    <a href="#-开发命令">开发命令</a> •
    <a href="#-环境变量">环境变量</a> •
    <a href="#-贡献指南">贡献指南</a>
  </p>
</p>

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **微前端** | [Garfish](https://www.garfish.dev/) (host/子应用架构) |
| **前端框架** | React 18 (核心应用) / Vue 3 (用户主页子应用) |
| **构建工具** | Vite 6 + pnpm 9 Monorepo |
| **状态管理** | Zustand (React) / Pinia (Vue) |
| **网络请求** | [@connectrpc/connect-web](https://connectrpc.com/) + protobuf-es (HTTP/2 + Protobuf) |
| **样式方案** | Tailwind CSS + CSS Modules (Less) + Ant Design 5.x |
| **代码规范** | [Biome](https://biomejs.dev/) (format + lint) + commitlint + husky |
| **后端语言** | Rust (edition 2024, stable) |
| **HTTP 网关** | [Axum](https://github.com/tokio-rs/axum) 0.8 |
| **微服务 RPC** | [Tonic](https://github.com/hyperium/tonic) 0.14 (gRPC) + prost (Protobuf) |
| **ORM** | [SeaORM](https://www.sea-ql.org/SeaORM/) + PostgreSQL 16 |
| **缓存** | Redis 7 |
| **搜索引擎** | [Meilisearch](https://www.meilisearch.com/) |
| **服务发现** | [Consul](https://www.consul.io/) |
| **消息队列** | [NATS](https://nats.io/) |
| **API 文档** | [utoipa](https://github.com/juhaku/utoipa) + Swagger UI |
| **单元测试** | [Vitest](https://vitest.dev/) (前端) + cargo test (后端) |
| **E2E 测试** | [Playwright](https://playwright.dev/) (Chromium / Firefox / WebKit) |
| **基础设施** | Docker Compose (dev) → K8s (prod) |

## 前置依赖

> 以下工具需要在本地安装后才能进行开发。

| 工具 | 最低版本 | 安装方式 | 说明 |
|------|---------|---------|------|
| **Rust** | stable | [rustup.rs](https://rustup.rs) | 后端编译 |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org) | 前端运行时 |
| **pnpm** | 9+ | `npm install -g pnpm` | 前端包管理 |
| **Docker** | 24+ | [docker.com](https://docker.com) | 基础设施容器 |
| **buf** | 1.x | `brew install bufbuild/buf/buf` | Protobuf 工具链 |
| protoc-gen-prost | latest | `cargo install protoc-gen-prost` | Rust Protobuf 代码生成 |
| protoc-gen-tonic | latest | `cargo install protoc-gen-tonic` | Rust gRPC 代码生成 |

**推荐安装（可选）**：

```bash
cargo install cargo-watch     # Rust 热重载
cargo install sea-orm-cli     # 数据库迁移 + Entity 生成
brew install grpcurl           # gRPC 命令行调试
```

## 快速启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd community_platform

# 2. 一键初始化（检查工具 + 安装依赖 + 复制 .env）
make setup

# 3. 启动基础设施（PostgreSQL + Redis + Meilisearch + Consul + NATS）
make dev-infra

# 4. 生成 Protobuf 代码（Rust + TypeScript）
make proto

# 5. 运行数据库迁移
make db-migrate

# 6. 一键启动全栈（后端 + 前端）
make dev-full
```

启动后可访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端主应用 | http://localhost:5173 | React + Garfish host |
| Feed 子应用 | http://localhost:5174 | React 子应用 |
| User Profile 子应用 | http://localhost:5175 | Vue 3 子应用 |
| Gateway API | http://localhost:8000 | HTTP/2 + Connect RPC |
| Swagger UI | http://localhost:8000/swagger-ui/ | API 文档 |
| Consul UI | http://localhost:8500 | 服务发现控制台 |
| Meilisearch | http://localhost:7700 | 搜索引擎管理 |
| NATS Monitor | http://localhost:8222 | 消息队列监控 |

> **日常开发** 只启动前端？运行 `make dev` 即可（自动清理注册表 + 并行启动所有子应用）。

## 项目结构

```
community_platform/
├── apps/                        # 前端子应用（Garfish 微前端）
│   ├── main/                    #   主应用 (React 18, Garfish host, :5173)
│   ├── feed/                    #   Feed 子应用 (React 18, :5174)
│   └── user-profile/            #   用户主页子应用 (Vue 3, :5175)
│
├── packages/                    # 前端共享包
│   ├── shared-types/            #   Protobuf 生成的 TypeScript 类型
│   ├── app-registry/            #   微前端子应用服务发现注册表
│   └── dev-kit/                 #   Vite 插件 + 开发工具 (tsup 构建)
│
├── services/                    # Rust 后端微服务（Cargo workspace）
│   ├── gateway/                 #   HTTP 网关 (Axum, :8000)
│   ├── svc-user/                #   用户服务 (Tonic gRPC, :50051)
│   ├── svc-content/             #   内容服务 (Tonic gRPC, :50052)
│   ├── shared/                  #   公共库 (proto 类型、config、auth、discovery)
│   └── migration/               #   数据库迁移 (SeaORM)
│
├── proto/                       # Protobuf 定义（唯一真相源）
│   └── luhanxin/community/v1/   #   业务 proto 文件
│       ├── user.proto           #     用户服务
│       ├── article.proto        #     文章服务
│       ├── comment.proto        #     评论服务
│       ├── social.proto         #     社交互动（点赞/收藏）
│       ├── common.proto         #     公共类型（分页）
│       └── event.proto          #     事件信封（NATS）
│
├── docker/                      # Docker Compose 开发环境
│   ├── docker-compose.yml       #   PostgreSQL + Redis + Meilisearch + Consul + NATS
│   ├── .env.example             #   环境变量模板
│   └── .env                     #   本地环境变量（gitignored）
│
├── scripts/                     # 自动化脚本
│   ├── dev.sh                   #   前端并行启动 + 注册表管理
│   ├── build-preview.sh         #   子应用 bundle 组装
│   └── gen-proto-mod.sh         #   Rust proto mod.rs 自动生成
│
├── docs/                        # 项目文档
│   ├── design/YYYY-MM-DD/       #   架构设计（按日期组织）
│   └── tech/                    #   技术调研与选型
│
├── openspec/                    # OpenSpec 工作流（先文档后代码）
│   ├── config.yaml              #   项目上下文与规则
│   ├── specs/                   #   主线规格文档
│   └── changes/                 #   变更记录（提案 → 设计 → 任务 → 归档）
│
├── tests/                       # 前端单元测试 (Vitest)
├── e2e/                         # E2E 测试 (Playwright)
├── Makefile                     # 开发命令集成（运行 make help 查看）
├── biome.json                   # 前端代码规范（Biome）
├── pnpm-workspace.yaml          # pnpm Monorepo 配置
└── package.json                 # 根 package.json
```

## 端口分配

| 端口 | 服务 | 协议 |
|------|------|------|
| 5173 | Main App (React) | HTTP |
| 5174 | Feed App (React) | HTTP |
| 5175 | User Profile App (Vue) | HTTP |
| 4173 | Preview Server | HTTP |
| 8000 | Gateway | HTTP/2 (Connect RPC) |
| 50051 | svc-user | gRPC |
| 50052 | svc-content | gRPC |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 7700 | Meilisearch | HTTP |
| 8500 | Consul | HTTP |
| 4222 | NATS | TCP |
| 8222 | NATS Monitor | HTTP |

## 开发命令

所有常用操作都集成在 `Makefile` 中，运行 `make help` 查看完整列表。

### 全栈

| 命令 | 说明 |
|------|------|
| `make setup` | 首次初始化（检查工具 + 安装依赖 + 复制 .env） |
| `make dev` | 启动前端所有子应用（日常推荐） |
| `make dev-full` | 一键全栈（基础设施 + 后端 + 前端） |
| `make build` | 构建全部（后端 release + 前端） |
| `make test` | 运行所有测试 |
| `make check` | CI 完整检查（格式 + lint + 类型检查） |
| `make kill-ports` | 杀掉项目占用的端口进程 |
| `make clean` | 清理构建产物 |
| `make clean-all` | 深度清理（含 node_modules） |

### Protobuf

| 命令 | 说明 |
|------|------|
| `make proto` | 生成 Rust + TypeScript 代码 |
| `make proto-lint` | 检查 Proto 文件规范 |
| `make proto-breaking` | 检测不兼容变更 |

> **注意**：必须使用 `make proto` 而不是直接运行 `buf generate`，因为 `make proto` 会在 buf generate 之后自动运行 `gen-proto-mod.sh` 生成 Rust 的 `mod.rs` 嵌套模块结构。

### 后端

| 命令 | 说明 |
|------|------|
| `make dev-backend` | 启动后端服务（有 cargo-watch 则热重载） |
| `make build-backend` | 构建后端 release |
| `make test-backend` | 运行后端测试 |

### 前端

| 命令 | 说明 |
|------|------|
| `make dev-frontend` | 启动前端所有子应用 |
| `make dev-frontend-main` | 只启动主应用 |
| `make dev-frontend-feed` | 只启动 feed 子应用 |
| `make build-frontend` | 构建前端 |
| `make preview` | 构建并启动 preview server |

### 数据库

| 命令 | 说明 |
|------|------|
| `make db-migrate` | 运行数据库迁移 |
| `make db-migrate-down` | 回滚最近一次迁移 |
| `make db-migrate-status` | 查看迁移状态 |
| `make db-migrate-fresh` | 重建数据库（drop + re-migrate） |
| `make db-entity` | 从数据库生成 SeaORM Entity |
| `make db-reset` | 重置数据库（drop + create + migrate） |

### 代码质量

| 命令 | 说明 |
|------|------|
| `make fmt` | 格式化所有代码（Rust + TypeScript） |
| `make lint` | 运行所有 lint（Clippy + Biome + Proto） |
| `make typecheck` | TypeScript 类型检查 |

### 基础设施

| 命令 | 说明 |
|------|------|
| `make dev-infra` | 启动 Docker 容器 |
| `make dev-infra-down` | 停止 Docker 容器 |
| `make dev-infra-logs` | 查看容器日志 |

## 环境变量

### 后端环境变量 (`docker/.env`)

从 `docker/.env.example` 复制并修改。`make setup` 会自动完成。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgres://luhanxin:...@localhost:5432/luhanxin_community` | PostgreSQL 连接串（**必填**） |
| `REDIS_URL` | `redis://:redis_dev_2024@localhost:6379` | Redis 连接串 |
| `MEILI_URL` | `http://localhost:7700` | Meilisearch 地址 |
| `JWT_SECRET` | `dev_jwt_secret_...` | JWT 签名密钥（**必填**） |
| `JWT_EXPIRY_HOURS` | `168` | Token 过期时间（小时） |
| `GATEWAY_PORT` | `8000` | Gateway 监听端口 |
| `SVC_USER_PORT` | `50051` | 用户服务 gRPC 端口 |
| `SVC_CONTENT_PORT` | `50052` | 内容服务 gRPC 端口 |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary Cloud Name（图片上传） |
| `CLOUDINARY_API_KEY` | — | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API Secret |

### 前端环境变量 (`apps/main/.env.local`)

| 变量 | 说明 |
|------|------|
| `VITE_GIPHY_API_KEY` | GIPHY API Key（GIF/Sticker 选择器） |

> `.env` 和 `.env.local` 文件均在 `.gitignore` 中，不会被提交。

## 协议选型

| 场景 | 协议 | 数据格式 |
|------|------|---------|
| 前端 API 请求 | HTTP/2 (Connect) | Protobuf |
| 微服务间调用 | gRPC (Tonic) | Protobuf |
| 异步事件 | NATS | Protobuf |
| 实时通知推送 | WebSocket | Protobuf |
| AI 流式输出 | SSE | JSON |
| 文件上传 | HTTP/2 | multipart |
| 服务发现 | Consul HTTP API | JSON |

> **核心原则**：所有前后端 API 交互使用 Protobuf，不使用 JSON。Proto 文件是唯一真相源（Single Source of Truth）。

## OpenSpec 工作流

本项目使用 **OpenSpec** 管理功能变更，遵循「**先文档、后代码**」原则。

> **规则**：任何涉及新功能、架构变更、接口变更的代码，必须先完成 OpenSpec 文档（提案 → 设计 → 任务拆分），再提交代码 PR。纯 bugfix / typo 除外。

```
提案 (Proposal)  →  设计 (Design)  →  任务拆分 (Tasks)  →  实现  →  归档
```

## 贡献指南

### Git 提交规范

```
<type>(<scope>): <subject>
```

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `ci`
- **scope**: `main` | `feed` | `user-profile` | `shared-types` | `app-registry` | `dev-kit` | `gateway` | `svc-user` | `svc-content` | `proto` | `infra` | `docs`

### 分支命名

```
<type>/short-description
```

示例：`feat/dark-mode`、`fix/avatar-upload`、`docs/readme-update`

### PR 流程

1. **功能/架构变更**：先完成 OpenSpec 文档，再提交代码 PR
2. **Bug 修复 / Typo**：可直接提交 PR
3. 所有 PR 必须通过 `make check`

## 文档导航

| 目录 | 说明 |
|------|------|
| [`docs/design/`](docs/design/) | 架构设计文档（按日期组织） |
| [`docs/tech/`](docs/tech/) | 技术调研与选型（01-09 编号） |
| [`services/README.md`](services/README.md) | 后端服务开发指南 |
| [`openspec/`](openspec/) | OpenSpec 工作流文档 |

## License

[MIT](LICENSE)
