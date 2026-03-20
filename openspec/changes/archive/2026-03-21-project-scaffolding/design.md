## Context

当前项目处于"零代码"状态——仅有 6 份设计文档、2 份技术调研和项目规范。需要将设计落地为可运行的工程骨架。

核心约束：
- **Protobuf 优先**：前后端 API 交互使用 Connect Protocol + Protobuf，不用 JSON
- **Monorepo 双栈**：前端 pnpm workspace，后端 Rust Cargo workspace
- **微前端**：Garfish 管理多个子应用（React 为主 + Vue 管理后台）
- **微服务**：Gateway (Axum HTTP) → 各 svc (Tonic gRPC)

利益相关者：个人开发者项目，一人全栈开发。

## Goals / Non-Goals

**Goals:**
- 建立完整的项目目录结构，让后续功能开发有据可循
- 打通 Proto → Rust/TypeScript 代码生成管道
- 实现端到端 Hello World（前端 → Gateway → svc-user → 响应）
- Docker 一键启动开发依赖（PostgreSQL、Redis、Meilisearch）
- 所有配置可复制——新环境 clone 后 3 条命令内跑起来

**Non-Goals:**
- ❌ 不实现任何业务逻辑（用户注册、文章发布等属于后续 change）
- ❌ 不搭建 CI/CD 管道（GitHub Actions 属于后续）
- ❌ 不配置生产环境（K8s、域名、HTTPS 等属于后续）
- ❌ 不实现数据库迁移（SeaORM migration 属于后续 svc-user 功能开发时）
- ❌ 不搭建监控（Prometheus/Grafana/Sentry 属于后续 infra change）
- ❌ 不创建 Vue 管理后台子应用（Phase 2 内容）

## Decisions

### D1: Proto 工具链选择 buf 而非 protoc

**选择**: buf CLI + buf.gen.yaml 配置式代码生成

**替代方案**:
- `protoc` + 各语言插件：需要手动管理插件版本和路径，配置繁琐
- `tonic-build` 在 Rust build.rs 中直接编译：仅限 Rust，前端还是需要另外的工具

**理由**:
- buf 统一管理 Rust (prost) + TypeScript (protobuf-es) 的代码生成
- `buf lint` 内置 proto 规范检查
- `buf breaking` 检测不兼容变更，防止破坏前后端契约
- 社区活跃，与 Connect Protocol 生态无缝集成

### D2: Gateway 采用 Axum HTTP 而非直接暴露 gRPC

**选择**: Gateway 是 Axum HTTP 服务，对外提供 Connect Protocol（HTTP/2 + Protobuf），对内通过 gRPC 调用各微服务

**替代方案**:
- 前端直连各微服务 gRPC：无法统一鉴权、限流、日志
- Envoy/Nginx 作为 Gateway：引入额外运维复杂度，开发期过重

**理由**:
- Axum 作为 Gateway 可以灵活添加中间件（auth、rate limit、CORS、logging）
- Connect Protocol 与 gRPC 二进制兼容，前端无需 gRPC-Web proxy
- 单一入口简化前端配置（一个 baseUrl 即可）
- 后续可平滑迁移到 Envoy 等专业网关

### D3: 前端 Garfish 微前端 + Vite 构建

**选择**: Garfish 作为微前端框架，每个子应用独立 Vite 构建

**替代方案**:
- Module Federation (Webpack 5)：需要 Webpack，与 Vite 生态不兼容
- Single-SPA：配置复杂，社区支持偏少
- 不用微前端，全部打一个大包：后期管理后台 (Vue) 无法接入

**理由**:
- Garfish 原生支持 Vite，配置简单
- 支持 React + Vue 混合部署（核心应用 React，管理后台 Vue）
- web-infra-dev 团队维护，与 Rspack 生态兼容
- 子应用独立开发、独立部署

### D4: Rust Workspace 结构设计

**选择**: 扁平 workspace，3 个初始 crate

```
services/
├── Cargo.toml          # workspace root
├── gateway/            # HTTP Gateway (Axum)
├── svc-user/           # 用户服务 (Tonic gRPC)
└── shared/             # 公共库 (proto 生成、错误、配置)
```

**替代方案**:
- 每个服务独立仓库：微服务纯度高但协作成本大
- 单个 crate 多模块：前期简单但后期耦合

**理由**:
- Workspace 共享依赖编译缓存，加快构建速度
- `shared` crate 存放 proto 生成代码、公共错误类型和配置加载
- 后续新增微服务只需在 workspace 中添加新 crate
- 一人开发，Monorepo 管理最高效

### D5: 前端 shared-types 包存放 protobuf-es 生成代码

**选择**: `packages/shared-types/` 作为独立 pnpm 包，存放 buf generate 生成的 TypeScript 代码

**替代方案**:
- 各子应用各自生成：代码重复，版本不一致
- 放在 `apps/main/` 中引用：其他子应用依赖路径不清晰

**理由**:
- 单一生成目标，所有子应用通过 `@luhanxin/shared-types` 引用
- 与 buf.gen.yaml 配合，一键生成到固定目录
- 类型修改只需重新 `buf generate`，所有子应用自动获取更新

### D6: Docker Compose 开发环境仅包含数据依赖

**选择**: Docker Compose 只运行 PostgreSQL + Redis + Meilisearch，后端和前端服务在宿主机运行

**替代方案**:
- 全容器化（含前后端）：开发体验差，热重载慢
- 不用 Docker，本地安装所有依赖：环境不一致

**理由**:
- 数据服务容器化保证一致性，无需手动安装 PostgreSQL/Redis
- 前后端在宿主机运行，享受原生热重载速度
- `docker compose up -d` 一条命令启动所有数据依赖

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| buf 版本更新可能破坏生成代码 | 前后端类型不一致 | `buf.lock` 锁定依赖版本 + CI 中加 `buf breaking` 检查 |
| Garfish 与 Vite 5+ 兼容性 | 微前端子应用加载失败 | 骨架阶段验证 Garfish + Vite 组合，锁定可用版本 |
| Rust 编译时间长 | 开发迭代慢 | 使用 `cargo-watch` 增量编译 + workspace 共享缓存 + `sccache` |
| Connect Protocol 浏览器兼容性 | HTTP/2 在旧浏览器不可用 | Connect 自动 fallback 到 HTTP/1.1 + Protobuf，无需额外处理 |
| 一人维护多微服务 | 运维负担重 | 初期仅 gateway + svc-user，按需新增；`shared` crate 最大化复用 |

## Open Questions

1. **是否需要 sccache / mold linker？** — Rust 编译优化工具，骨架阶段先不引入，编译过慢时再加
2. **Garfish 沙箱模式选择？** — `snapshot` vs `vm`，骨架阶段用默认 snapshot，后续按需切换
3. **proto 生成代码是否需要 git commit？** — 倾向于提交生成代码（确保无 buf 环境也能编译），但也可以在 CI 中生成
