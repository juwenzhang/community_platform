## Why

当前 `analytics-monitoring-system`、`headless-browser-screenshot` 等 change 设计了数据采集和存储能力，但**缺少数据可视化看板**。运营和管理员需要一个后台界面来：

1. **查看平台运营数据** — PV/UV、活跃用户、文章发布趋势、评论增长
2. **监控系统健康状态** — JS 错误率、API 延迟、安全事件、告警状态
3. **管理内容与用户** — 文章审核、评论审核、用户管理、封禁/解封
4. **配置系统参数** — 功能开关、敏感词库、SEO 配置、邮件模板

没有后台 Dashboard，这些数据只能通过 CLI 或数据库直查获取，无法满足日常运营需求。

## What Changes

### 新建独立前端应用 `apps/admin/`

采用 **Vue 3 + Naive UI + Pinia + Vue Router** 技术栈（符合项目规范中"管理后台用 Vue"的约定），作为**独立前端工程**，独立部署到 `admin.luhanxin.com`（内网/VPN 保护）。

**不作为微前端子应用**的原因：

| 维度 | 独立 APP 方案 | 微前端子应用方案 |
|------|--------------|----------------|
| **安全性** | ✅ 内网隔离，与主站完全分离 | ❌ 暴露 `/admin` 路由，安全隐患大 |
| **技术栈** | ✅ Vue 3 + Naive UI（符合规范） | ⚠️ Garfish 跨框架加载 Vue 较复杂 |
| **权限隔离** | ✅ 独立登录入口，VPN 保护 | ⚠️ 需与主站共享认证，边界不清 |
| **部署** | ✅ 独立域名、独立 CDN、独立扩展 | ⚠️ 与主站耦合，无法独立扩缩容 |
| **包体积** | ✅ 不影响主站 bundle | ❌ 主站需加载 admin 相关代码 |

### 核心功能模块

```
apps/admin/ (Vue 3 + Naive UI)
├── src/
│   ├── views/
│   │   ├── Dashboard/           # 概览页（PV/UV、错误率、活跃用户）
│   │   ├── Analytics/           # 数据分析（埋点、漏斗、留存）
│   │   ├── Monitoring/          # 监控看板（错误、性能、安全）
│   │   ├── Content/             # 内容管理（文章、评论审核）
│   │   ├── Users/               # 用户管理（列表、详情、封禁）
│   │   └── System/              # 系统设置（配置、日志）
│   ├── components/              # 公共组件
│   ├── stores/                  # Pinia stores
│   ├── router/                  # Vue Router 配置
│   └── lib/                     # API 封装（Connect RPC）
```

### 后端 API 支持

Gateway 新增 `/api/admin/*` 路由组，需要 `role: admin` 权限：

- `GET /api/admin/analytics/overview` — 获取运营概览数据
- `GET /api/admin/monitoring/errors` — 获取错误列表
- `GET /api/admin/monitoring/security` — 获取安全事件
- `GET /api/admin/content/articles` — 获取待审核文章列表
- `POST /api/admin/content/articles/:id/approve` — 批准文章
- `GET /api/admin/users` — 获取用户列表
- `POST /api/admin/users/:id/ban` — 封禁用户

## 非目标 (Non-goals)

- **不做运营 CRM** — 用户标签、营销活动、邮件群发等不在范围内
- **不做财务结算** — 打赏/订阅分成等财务功能不涉及
- **不做高级 BI** — 复杂的多维分析、自定义报表不在初始范围
- **不做移动端适配** — 后台仅支持桌面端浏览器

## 与现有设计文档的关系

- **`docs/design/2026-03-20/02-frontend-architecture.md`** — Admin 采用独立 APP 方案，遵循项目规范中"管理后台用 Vue"的约定
- **`openspec/changes/analytics-monitoring-system/`** — Admin Dashboard 是 analytics 数据的可视化前端
- **`openspec/changes/headless-browser-screenshot/`** — Admin 可调用截图服务生成报告
- **`openspec/changes/frontend-app-split/`** — Admin 不是微前端子应用，是独立前端工程

## Capabilities

### New Capabilities

- `admin-dashboard`: 管理后台前端应用 — 独立的 Vue 3 应用，提供运营数据、监控看板、内容管理、用户管理、系统配置等功能
- `admin-api-endpoints`: 管理后台 API — Gateway 新增 `/api/admin/*` 路由组，需要 admin 权限

### Modified Capabilities

- `gateway-routing`: Gateway 路由扩展 — 新增 admin 路由组和权限校验

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `apps/admin/` | 新增 | 完整的 Vue 3 管理后台前端应用 |
| `services/gateway/src/routes/admin.rs` | 新增 | Admin API 路由定义 |
| `services/gateway/src/interceptors/auth.rs` | 修改 | 新增 admin role 校验 |
| `pnpm-workspace.yaml` | 无变更 | `apps/*` 通配符已覆盖 admin |
| `package.json` | 修改 | 新增 `dev:admin`、`build:admin` 脚本 |

### API 影响

- 新增 `/api/admin/*` 路由组，需要 admin 权限
- 后端需新增 admin 权限校验逻辑

### 依赖影响

- 新增 `apps/admin/package.json` — 依赖 vue、naive-ui、pinia、vue-router、@connectrpc/connect-web 等

### 部署影响

- Admin Dashboard 独立部署到 `admin.luhanxin.com`
- 需配置内网/VPN 访问策略
- 需配置独立的 TLS 证书
