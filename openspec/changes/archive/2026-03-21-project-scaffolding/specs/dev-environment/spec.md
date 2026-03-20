## ADDED Requirements

### Requirement: Docker Compose 开发环境

`docker/docker-compose.yml` SHALL 定义以下数据依赖容器：

| 服务 | 镜像 | 容器名 | 端口 |
|------|------|--------|------|
| PostgreSQL 16 | `postgres:16-alpine` | `luhanxin-postgres` | 5432 |
| Redis 7 | `redis:7-alpine` | `luhanxin-redis` | 6379 |
| Meilisearch | `getmeili/meilisearch:latest` | `luhanxin-meilisearch` | 7700 |

所有容器 SHALL 配置健康检查（healthcheck）和数据持久化（named volumes）。

#### Scenario: Docker Compose 一键启动
- **WHEN** 在 `docker/` 目录运行 `docker compose up -d`
- **THEN** 三个容器均启动成功，健康检查通过

#### Scenario: PostgreSQL 可连接
- **WHEN** 容器启动后使用 `psql -h localhost -U luhanxin -d luhanxin_community` 连接
- **THEN** 连接成功，数据库 `luhanxin_community` 存在

#### Scenario: Redis 可连接
- **WHEN** 容器启动后使用 `redis-cli ping`
- **THEN** 返回 `PONG`

#### Scenario: Meilisearch 可连接
- **WHEN** 容器启动后访问 `http://localhost:7700/health`
- **THEN** 返回 `{"status": "available"}`

#### Scenario: 数据持久化
- **WHEN** 运行 `docker compose down` 后重新 `docker compose up -d`
- **THEN** PostgreSQL 数据不丢失（named volume 保留）

### Requirement: 环境变量模板

`docker/.env.example` SHALL 提供所有环境变量的模板，包括：
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `REDIS_URL`
- `MEILI_MASTER_KEY`, `MEILI_URL`
- `GATEWAY_PORT`, `SVC_USER_GRPC_PORT`

#### Scenario: .env.example 可直接复制使用
- **WHEN** 开发者执行 `cp docker/.env.example docker/.env`
- **THEN** 不修改任何值即可通过 `docker compose up -d` 启动开发环境

### Requirement: Makefile / Justfile 开发命令

项目根目录 SHALL 包含 `Makefile`（或 `justfile`），提供以下常用命令：

| 命令 | 功能 |
|------|------|
| `make proto` | 运行 `buf generate` 生成 Rust + TypeScript 代码 |
| `make dev-infra` | 启动 Docker Compose 数据依赖 |
| `make dev-backend` | 启动 Gateway + svc-user（cargo watch） |
| `make dev-frontend` | 启动前端所有子应用 |
| `make dev` | 一键启动全部（infra + backend + frontend） |
| `make build` | 构建全部（cargo build + pnpm build） |
| `make lint` | 运行 buf lint + biome check + cargo clippy |
| `make clean` | 清理构建产物 |

#### Scenario: make proto 生成代码
- **WHEN** 运行 `make proto`
- **THEN** Rust 和 TypeScript 代码均成功生成到各自目录

#### Scenario: make dev-infra 启动基础设施
- **WHEN** 运行 `make dev-infra`
- **THEN** Docker Compose 容器在后台启动

### Requirement: .gitignore 配置

项目根目录 SHALL 包含 `.gitignore` 文件，覆盖以下内容：
- Rust：`target/`
- Node.js：`node_modules/`, `.pnpm-store/`
- 环境变量：`*.env`（不含 `.env.example`）
- IDE：`.idea/`, `.vscode/`（保留 `.vscode/settings.json` 和 `.vscode/extensions.json`）
- OS：`.DS_Store`, `Thumbs.db`
- 构建产物：`dist/`

#### Scenario: .gitignore 排除正确
- **WHEN** 开发者运行 `cargo build` 和 `pnpm install` 后查看 `git status`
- **THEN** `target/` 和 `node_modules/` 不在未追踪文件列表中

### Requirement: README.md 快速启动

项目根目录 SHALL 包含 `README.md`，包含以下内容：
- 项目简介
- 技术栈概览
- 先决条件（Rust, Node.js, pnpm, Docker, buf）
- 快速启动步骤（clone → install → docker up → dev）
- 项目目录结构说明
- 常用命令参考（指向 Makefile）

#### Scenario: 新开发者 3 步启动
- **WHEN** 新开发者按照 README 指引，执行 `pnpm install` → `make dev-infra` → `make dev`
- **THEN** 前端和后端均成功启动，可在浏览器访问
