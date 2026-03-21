<p align="center">
  <h1 align="center">Luhanxin Community Platform</h1>
  <p align="center">
    面向开发者的编程社区平台 — 基于 Rust 微服务 + React 微前端的全栈架构
  </p>
  <p align="center">
    <a href="#-快速启动">快速启动</a> •
    <a href="#-开发命令">开发命令</a> •
    <a href="#-openspec-工作流">OpenSpec 工作流</a> •
    <a href="#-文档导航">文档导航</a> •
    <a href="#-项目结构">项目结构</a>
  </p>
</p>

---

## 🏗️ 技术栈一览

| 层级 | 技术 |
|------|------|
| **微前端** | Garfish (host/子应用架构) |
| **前端框架** | React 18 (核心应用) / Vue 3 (管理后台) |
| **构建** | Vite + pnpm Monorepo |
| **状态管理** | Zustand (React) / Pinia (Vue) |
| **网络请求** | @connectrpc/connect-web + protobuf-es (HTTP/2 + Protobuf) |
| **样式** | Tailwind CSS + Ant Design 5.x |
| **代码规范** | Biome (format + lint) + commitlint |
| **后端语言** | Rust (stable) |
| **Web Gateway** | Axum 0.7+ |
| **微服务 RPC** | Tonic (gRPC) + prost (Protobuf) |
| **ORM / 数据库** | SeaORM + PostgreSQL 16 |
| **缓存** | Redis 7 |
| **搜索** | Meilisearch |
| **基础设施** | Docker Compose (dev) → K8s (prod) |
| **监控** | Prometheus + Grafana + Sentry |

## 📋 先决条件

| 工具 | 版本 | 安装 |
|------|------|------|
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | 24+ | [docker.com](https://docker.com) |
| buf | 1.x | `brew install bufbuild/buf/buf` |

可选但推荐：

```bash
cargo install cargo-watch   # Rust 热重载
```

## 🚀 快速启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd community_platform

# 2. 安装前端依赖
make install            # 等同 pnpm install

# 3. 启动基础设施 (PostgreSQL + Redis + Meilisearch)
make dev-infra

# 4. 生成 Protobuf 代码
make proto

# 5. 一键启动全栈 (基础设施 + 后端 + 前端)
make dev-full
```

启动后访问：

| 服务 | 地址 |
|------|------|
| 🌐 前端主应用 | http://localhost:5173 |
| 🔌 Gateway API | http://localhost:8000 |
| 🔍 Meilisearch | http://localhost:7700 |

> 💡 **日常开发**只启动前端？用 `make dev` 即可（自动清理注册表 + 并行启动所有子应用）。

## 🔧 开发命令

项目所有常用操作都集成在 `Makefile` 中。运行 `make help` 查看完整列表。

### 全局

| 命令 | 说明 |
|------|------|
| `make dev` | 🚀 启动前端所有子应用（日常推荐） |
| `make dev-full` | 🚀 一键启动全栈（基础设施 + 后端 + 前端） |
| `make build` | 构建全部（后端 release + 前端） |
| `make test` | 运行所有测试（单元 + E2E） |
| `make check` | 完整检查（格式 + lint + 类型检查，CI 流水线） |
| `make clean` | 清理构建产物 |
| `make clean-all` | 深度清理（含 node_modules + 杀端口进程） |
| `make kill-ports` | 杀掉项目占用的端口进程 |

### Protobuf

| 命令 | 说明 |
|------|------|
| `make proto` | 生成 Protobuf Rust + TypeScript 代码 |
| `make proto-lint` | 检查 Proto 文件规范 |
| `make proto-breaking` | 检测 Proto 不兼容变更 |

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
| `make build-frontend` | 构建前端所有包和应用 |
| `make build-preview` | 构建并组装 preview 目录 |
| `make preview` | 构建 + 启动 preview server |

### 代码质量

| 命令 | 说明 |
|------|------|
| `make fmt` | 格式化所有代码（Rust + TypeScript） |
| `make lint` | 运行所有 lint 检查 |
| `make typecheck` | TypeScript 类型检查 |

### 基础设施

| 命令 | 说明 |
|------|------|
| `make dev-infra` | 启动 Docker 数据依赖 |
| `make dev-infra-down` | 停止 Docker 数据依赖 |
| `make dev-infra-logs` | 查看 Docker 容器日志 |

## 📐 OpenSpec 工作流

本项目使用 **OpenSpec** 管理所有功能变更，遵循「**先文档、后代码**」原则。

### ⚠️ 核心规则

> **任何涉及新功能、架构变更、接口变更的代码提交，必须先完成对应的 OpenSpec 文档，再提交代码 PR。**
>
> 没有 OpenSpec 文档的代码 PR 将不予合并（纯 bugfix / typo 除外）。

### 工作流程

```
1. 提案 (Proposal)     →  描述做什么、为什么做、非目标
2. 设计 (Design)       →  技术方案、API 定义(Protobuf)、数据模型
3. 任务拆分 (Tasks)    →  1-3h 粒度，标注依赖，Proto 任务优先
4. 实现 (Implement)    →  按任务逐步编码
5. 归档 (Archive)      →  变更完成后归档 change
```

### 目录结构

```
openspec/
├── config.yaml          # 项目上下文与规则配置
├── specs/               # 主线规格文档（通过 sync 更新）
└── changes/             # 变更记录
    └── archive/         # 已归档的变更
```

### 快速上手 OpenSpec

使用 CodeBuddy 的 OpenSpec 技能来管理变更：

| 操作 | 说明 |
|------|------|
| 新建变更 | 调用 `openspec-new-change` 技能 |
| 继续变更 | 调用 `openspec-continue-change` 技能 |
| 快速推进 | 调用 `openspec-ff-change` 技能（一键生成所有 artifact） |
| 一步提案 | 调用 `openspec-propose` 技能（描述需求 → 完整提案） |
| 实现任务 | 调用 `openspec-apply-change` 技能 |
| 验证实现 | 调用 `openspec-verify-change` 技能 |
| 归档变更 | 调用 `openspec-archive-change` 技能 |

## 📚 文档导航

| 目录 | 说明 |
|------|------|
| [`docs/design/`](docs/design/) | 架构设计文档，按日期子目录组织，记录每次设计决策的演进 |
| [`docs/tech/`](docs/tech/) | 技术调研与选型文档（序列化格式、通信协议、微前端方案等） |
| [`openspec/`](openspec/) | OpenSpec 工作流（变更提案、设计、任务拆分、归档记录） |

> 💡 文档随项目迭代持续更新，直接进入对应目录浏览即可。

## 📂 项目结构

```
community_platform/
├── apps/                    # 前端子应用 (Garfish 微前端)
│   ├── main/                #   主应用 (React + Garfish host)
│   └── feed/                #   Feed 子应用 (React)
├── packages/                # 前端共享包
│   ├── shared-types/        #   Protobuf 生成的 TypeScript 类型
│   └── app-registry/        #   微前端子应用服务发现注册表
├── services/                # Rust 后端微服务
│   ├── gateway/             #   HTTP Gateway (Axum)
│   ├── svc-user/            #   用户服务 (Tonic gRPC)
│   └── shared/              #   公共库 (proto、配置、错误、网络工具)
├── proto/                   # Protobuf 定义 (唯一真相源)
│   └── community/v1/        #   业务 proto 文件
├── docker/                  # Docker Compose 开发环境
├── docs/                    # 文档
│   ├── design/              #   设计文档 (按日期组织)
│   └── tech/                #   技术调研
├── openspec/                # OpenSpec 工作流
│   ├── config.yaml          #   项目上下文与规则
│   ├── specs/               #   主线规格文档
│   └── changes/             #   变更记录
├── scripts/                 # 脚本工具
├── tests/                   # 测试
├── e2e/                     # E2E 测试
├── Makefile                 # 开发命令集成 (运行 make help 查看)
├── biome.json               # 前端代码规范
└── package.json             # Monorepo 根配置
```

## 📡 协议选型

| 场景 | 协议 | 数据格式 |
|------|------|---------|
| 前端 API 请求 | HTTP/2 (Connect) | Protobuf |
| 实时通知推送 | WebSocket | Protobuf |
| AI 流式输出 | SSE | JSON |
| 微服务间调用 | gRPC (Tonic) | Protobuf |
| 异步事件 | Redis Streams | Protobuf |
| 文件上传 | HTTP/2 | multipart |

## 🤝 贡献指南

### Git 提交规范

```bash
# commit rules
<type>[(<scope>)]: <subject>

git commit -m "feat(main): add new feature"
```

```bash
# branch rules

git checkout -b <type>/xxx
```

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `ci`
- **scope**: `main` | `feed` | `article` | `editor` | `profile` | `search` | `admin` | `shared-types` | `shared-utils` | `gateway` | `svc-user` | `proto` | `infra` | `docs`

### PR 流程

1. **功能/架构变更**：先完成 OpenSpec 文档（提案 → 设计 → 任务），再提交代码 PR
2. **Bug 修复 / Typo**：可直接提交 PR，无需 OpenSpec
3. 所有 PR 必须通过 `make check`（格式 + lint + 类型检查）

## 📜 License

MIT
