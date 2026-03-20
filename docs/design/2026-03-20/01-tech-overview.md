# Luhanxin Community Platform — 技术方案总览

> 📅 创建日期：2026-03-20
> 📌 状态：Draft — 待 Review

---

## 1. 项目愿景

打造一个**面向开发者的编程社区平台**（类似稀土掘金 / Dev.to / Hashnode），核心定位：

- 📝 **技术内容创作与分享** — 文章、教程、代码片段、系列专栏
- 💬 **技术交流与讨论** — 评论、问答、话题讨论
- 👤 **开发者档案与成长** — 个人主页、技能标签、贡献记录
- 🏷️ **技术标签与分类** — 多维度内容组织与发现
- 🔔 **社交互动** — 关注、点赞、收藏、消息通知

### 1.1 远期目标（可扩展方向）

- 🤖 RAG 智能问答 / AI 辅助写作
- 📊 数据分析与推荐系统
- 🏆 社区积分与成就系统
- 📦 开源项目展示与协作
- 🎓 在线课程与学习路径

---

## 2. 整体架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户层 (Browser)                          │
│                   PC (响应式) + Mobile (适配)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Garfish 微前端主应用 (React)                  │
│              ┌──────────┬──────────┬──────────┬────────────┐    │
│              │ 首页/Feed │ 文章详情  │ 用户中心  │ 管理后台    │    │
│              │ (React)  │ (React)  │ (React)  │ (Vue3)     │    │
│              └──────────┴──────────┴──────────┴────────────┘    │
│              ┌──────────┬──────────┐                            │
│              │ 创作中心  │ 搜索/发现  │                           │
│              │ (React)  │ (React)  │                            │
│              └──────────┴──────────┘                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/2 + Protobuf (Connect Protocol)
┌────────────────────────────▼────────────────────────────────────┐
│                     API Gateway (Rust)                           │
│              认证 · 限流 · 路由 · 日志 · CORS                     │
└────────┬───────────┬───────────┬───────────┬────────────────────┘
         │           │           │           │
    ┌────▼───┐ ┌─────▼────┐ ┌───▼────┐ ┌───▼──────┐
    │ 用户    │ │ 内容     │ │ 社交   │ │ 通知     │
    │ 服务    │ │ 服务     │ │ 服务   │ │ 服务     │
    │ (Rust) │ │ (Rust)  │ │(Rust) │ │ (Rust)  │
    └────┬───┘ └────┬────┘ └───┬───┘ └────┬─────┘
         │          │          │           │
┌────────▼──────────▼──────────▼───────────▼──────────────────────┐
│                      数据层                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │PostgreSQL│ │  Redis   │ │   Meilisearch  │ │ MinIO/S3 (OSS) │   │
│  │ (主数据库)│ │ (缓存)   │ │ (全文搜索) │ │ (文件存储)       │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    基础设施层                                     │
│  Docker Compose (开发) → Docker Swarm/K8s (生产)                 │
│  Prometheus + Grafana (监控) · Sentry (错误追踪)                  │
│  自研埋点 SDK → ClickHouse (行为分析)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术栈总览

### 3.1 前端技术栈

| 分类 | 技术选型 | 说明 |
|------|---------|------|
| **包管理** | pnpm + workspace | Monorepo 管理，依赖共享 |
| **微前端** | Garfish (web-infra-dev) | 技术栈无关，支持 React + Vue 混合 |
| **主框架** | React 18+ (主应用+核心子应用) | 社区生态丰富，组件库选择多 |
| **辅助框架** | Vue 3 (管理后台等增强功能) | 通过 Garfish 集成 |
| **构建工具** | Vite (React/Vue 子应用) | 快速 HMR，原生 ESM |
| **路由** | React Router v6 / Vue Router v4 | 各自生态标准方案 |
| **状态管理** | Zustand (React) / Pinia (Vue) | 轻量、TypeScript 友好 |
| **网络请求** | @connectrpc/connect-web + protobuf-es | Protobuf over HTTP，类型安全 RPC |
| **CSS 方案** | Tailwind CSS + CSS Modules | 原子化 + 模块化结合 |
| **组件库** | Ant Design 5.x (React) / Naive UI (Vue) | 成熟稳定 |
| **代码规范** | Biome (format + lint) | 替代 ESLint + Prettier，速度极快 |
| **拼写检查** | cspell | 代码拼写检查 |
| **E2E 测试** | Playwright | 跨浏览器 E2E 测试 |
| **Git Hooks** | husky + commitlint | 提交规范化 |
| **TypeScript** | 全量 TypeScript | 类型安全 |
| **PC 适配** | 响应式布局 (Tailwind breakpoints) | 支持 1920/1440/1280 等 |
| **移动适配** | 响应式 + viewport 方案 | 支持手机和平板访问 |

### 3.2 后端技术栈

| 分类 | 技术选型 | 说明 |
|------|---------|------|
| **语言** | Rust (stable) | 高性能、内存安全 |
| **Web 框架** | Axum | tokio 生态、tower 中间件体系 |
| **ORM** | SeaORM | 异步 ORM，支持 PostgreSQL |
| **数据库** | PostgreSQL 16 | 主数据库，支持全文搜索、JSONB |
| **缓存** | Redis 7 | 会话、缓存、消息队列 |
| **搜索引擎** | Meilisearch | Rust 编写的全文搜索引擎 |
| **对象存储** | MinIO (开发) / S3 (生产) | 图片、文件上传 |
| **消息队列** | Redis Streams / NATS | 异步任务、事件驱动 |
| **认证** | JWT + OAuth2 (GitHub/Google) | 无状态认证 |
| **API 风格** | RESTful + Connect Protocol (gRPC 兼容) | 资源导向 + RPC |
| **API 文档** | buf + .proto 文件 | 自动生成多语言代码 |
| **数据库迁移** | sea-orm-migration | 版本化迁移管理 |
| **序列化** | prost (Protobuf) + serde | 前后端交互用 Protobuf，内部用 serde |
| **日志** | tracing + tracing-subscriber | 结构化日志 |
| **错误处理** | thiserror + anyhow | 类型化错误 |

### 3.3 基础设施

| 分类 | 技术选型 | 说明 |
|------|---------|------|
| **容器化** | Docker + Docker Compose | 开发环境一键启动 |
| **编排** | Docker Compose (dev) / K8s (prod) | 渐进式部署方案 |
| **监控** | Prometheus + Grafana | 系统指标采集与可视化 |
| **错误追踪** | Sentry | 前后端错误收集 |
| **前端埋点** | 自研 SDK → ClickHouse | 用户行为分析 |
| **CI/CD** | GitHub Actions | 自动化测试与部署 |
| **反向代理** | Nginx / Traefik | 负载均衡、SSL 终止 |

---

## 4. 主题设计

### 4.1 Light Mode (亮色主题)
- **主色**：天蓝色 `#0EA5E9` (sky-500)
- **辅助色**：`#38BDF8` (sky-400)
- **背景**：纯白 `#FFFFFF`
- **卡片背景**：`#F8FAFC` (slate-50)
- **文字主色**：`#1E293B` (slate-800)
- **文字次色**：`#64748B` (slate-500)
- **边框**：`#E2E8F0` (slate-200)

### 4.2 Dark Mode (暗色主题)
- **主色**：天蓝色 `#38BDF8` (sky-400)
- **辅助色**：`#7DD3FC` (sky-300)
- **背景**：深灰蓝 `#0F172A` (slate-900)
- **卡片背景**：`#1E293B` (slate-800)
- **文字主色**：`#F1F5F9` (slate-100)
- **文字次色**：`#94A3B8` (slate-400)
- **边框**：`#334155` (slate-700)

> 暗色主题选择深灰蓝（Slate）色系搭配天蓝色，视觉柔和不刺眼，适合长时间阅读代码和文章。

---

## 5. 约定大于配置 — 核心设计原则

整个项目遵循**约定大于配置（Convention over Configuration）**的理念：

### 5.1 目录约定
```
apps/                          # 子应用目录
  main/                        # 主应用 (React, Garfish 主体)
  editor/                      # 创作中心 (React)
  admin/                       # 管理后台 (Vue3)
  ...
packages/                      # 共享包目录
  shared-types/                # 共享类型定义
  shared-utils/                # 工具函数
  shared-ui/                   # 共享 UI 组件
  sdk-tracker/                 # 埋点 SDK
  sdk-auth/                    # 认证 SDK
  config-biome/                # Biome 配置
  config-ts/                   # TypeScript 配置
  config-vite/                 # Vite 配置
services/                      # Rust 后端服务
  gateway/                     # API 网关
  svc-user/                    # 用户服务
  svc-content/                 # 内容服务
  svc-social/                  # 社交服务
  svc-notification/            # 通知服务
  svc-search/                  # 搜索服务
  shared/                      # 共享库 (Rust workspace)
docker/                        # Docker 相关配置
docs/                          # 文档 (按日期归档)
scripts/                       # 脚本工具
```

### 5.2 命名约定
- **子应用**：`apps/<name>/` → 自动注册到 Garfish
- **共享包**：`packages/<name>/` → 通过 workspace protocol 引用
- **后端服务**：`services/svc-<domain>/` → 独立可部署微服务
- **API 路由**：`/api/v1/<service>/<resource>` → RESTful 标准
- **组件**：PascalCase，`ComponentName.tsx` / `ComponentName.vue`
- **工具函数**：camelCase，`utils/formatDate.ts`
- **常量**：SCREAMING_SNAKE_CASE

### 5.3 配置继承
- 所有子应用继承根级 `biome.json`、`tsconfig.base.json`
- Vite 配置通过 `packages/config-vite` 统一管理
- Garfish 子应用注册通过约定目录自动发现

### 5.4 自动化友好
这种约定模式为后续集成自动化工具做好准备：
- **CLI 工具**：`pnpm gen:app <name>` 自动生成子应用脚手架
- **CI/CD**：基于变更路径自动触发对应服务的构建
- **代码生成**：基于 OpenAPI schema 自动生成前端 API 客户端
- **RAG 接入**：约定化的目录结构便于 AI 理解和操作

---

## 6. 可扩展性设计

```
Phase 1 (MVP):  社区核心功能 — 文章发布、阅读、互动
Phase 2:        搜索增强、通知系统、管理后台
Phase 3:        AI 功能 — RAG 问答、智能推荐、AI 写作助手
Phase 4:        开源项目展示、在线代码运行、学习路径
```

---

## 7. 后续文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 前端架构设计 | `docs/2026-03-20/02-frontend-architecture.md` | 微前端 + Monorepo 详细设计 |
| 后端架构设计 | `docs/2026-03-20/03-backend-architecture.md` | Rust 微服务详细设计 |
| 数据库设计 | `docs/2026-03-20/04-database-design.md` | PostgreSQL 数据模型 |
| 基础设施 | `docs/2026-03-20/05-infrastructure.md` | Docker + 监控 + 埋点 |
| 功能模块规划 | `docs/2026-03-20/06-feature-modules.md` | 功能模块与开发优先级 |
