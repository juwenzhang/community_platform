# Luhanxin Community Platform

> 一个基于 Rust 微服务 + React 微前端的全栈社区平台

## 🏗️ 技术栈

### 前端
- **微前端**: Garfish
- **框架**: React 18 (核心应用) / Vue 3 (管理后台)
- **构建**: Vite
- **状态管理**: Zustand (React) / Pinia (Vue)
- **网络请求**: @connectrpc/connect-web + protobuf-es
- **样式**: Tailwind CSS + Ant Design 5.x
- **代码规范**: Biome
- **包管理**: pnpm Monorepo

### 后端
- **语言**: Rust (stable)
- **Web 框架**: Axum 0.7+ (Gateway)
- **RPC**: Tonic (gRPC 微服务)
- **序列化**: Protobuf (prost)
- **ORM**: SeaORM
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **搜索**: Meilisearch

### 基础设施
- Docker Compose (开发) / K8s (生产)
- Prometheus + Grafana (监控)
- Sentry (错误追踪)

## 📋 先决条件

| 工具 | 版本 | 安装 |
|------|------|------|
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | 24+ | [docker.com](https://docker.com) |
| buf | 1.x | `brew install bufbuild/buf/buf` |

## 🚀 快速启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd community_platform

# 2. 安装前端依赖
pnpm install

# 3. 启动数据依赖 (PostgreSQL + Redis + Meilisearch)
make dev-infra

# 4. 生成 Protobuf 代码
make proto

# 5. 一键启动全部服务
make dev
```

启动后访问：
- **前端主应用**: http://localhost:5173
- **Gateway API**: http://localhost:8000
- **Meilisearch**: http://localhost:7700

## 📂 项目结构

```
community_platform/
├── apps/                    # 前端子应用 (Garfish 微前端)
│   ├── main/                #   主应用 (React + Garfish host)
│   └── feed/                #   Feed 子应用 (React)
├── packages/                # 前端共享包
│   └── shared-types/        #   Protobuf 生成的 TypeScript 类型
├── services/                # Rust 后端微服务
│   ├── gateway/             #   HTTP Gateway (Axum)
│   ├── svc-user/            #   用户服务 (Tonic gRPC)
│   └── shared/              #   公共库 (proto、配置、错误)
├── proto/                   # Protobuf 定义 (唯一真相源)
│   └── community/v1/        #   业务 proto 文件
├── docker/                  # Docker Compose 开发环境
├── docs/                    # 文档
│   ├── design/              #   设计文档 (按日期组织)
│   └── tech/                #   技术调研
├── openspec/                # OpenSpec 工作流
├── Makefile                 # 常用开发命令
└── biome.json               # 前端代码规范
```

## 🔧 常用命令

| 命令 | 说明 |
|------|------|
| `make proto` | 生成 Protobuf Rust + TypeScript 代码 |
| `make dev-infra` | 启动 Docker 数据依赖 |
| `make dev-backend` | 启动后端服务 (Gateway + svc-user) |
| `make dev-frontend` | 启动前端所有子应用 |
| `make dev` | 一键启动全部 |
| `make build` | 构建全部 |
| `make lint` | 运行所有 lint 检查 |
| `make clean` | 清理构建产物 |

## 📡 协议选型

| 场景 | 协议 | 数据格式 |
|------|------|---------|
| 前端 API 请求 | HTTP/2 (Connect) | Protobuf |
| 实时通知推送 | WebSocket | Protobuf |
| AI 流式输出 | SSE | JSON |
| 微服务间调用 | gRPC (Tonic) | Protobuf |
| 文件上传 | HTTP/2 | multipart |

## 📜 License

MIT
