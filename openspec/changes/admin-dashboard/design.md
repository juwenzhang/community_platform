## Context

项目已有完善的监控基础设施：

| 组件 | 职责 | 数据源 |
|------|------|--------|
| `@luhanxin/tracker` SDK | 前端埋点采集 | 用户行为、性能、错误 |
| `svc-analytics` | 事件存储与查询 | ClickHouse |
| `Prometheus + Grafana` | 基础设施监控 | 指标数据 |
| `Playwright 截图服务` | 页面快照 | S3/MinIO |

但缺少一个**统一的管理后台界面**来可视化这些数据。运营人员需要友好的 UI 来：

- 查看实时运营数据（PV/UV、活跃用户）
- 监控系统健康状态（错误率、API 延迟）
- 管理内容（审核文章/评论）
- 管理用户（封禁、查看详情）

## Goals / Non-Goals

**Goals:**

1. 新建独立前端应用 `apps/admin/`（Vue 3 + Naive UI）
2. 独立部署到 `admin.luhanxin.com`（内网/VPN 保护）
3. 提供运营数据、监控看板、内容管理、用户管理、系统配置五大模块
4. Gateway 新增 `/api/admin/*` API 路由组
5. 集成现有的 analytics 数据源（ClickHouse）和基础设施监控（Prometheus）

**Non-Goals:**

- 不做移动端适配
- 不做运营 CRM（用户标签、营销活动）
- 不做财务结算（打赏/订阅分成）
- 不做高级 BI（复杂多维分析）

## Decisions

### Decision 1: 技术栈选型

| 分类 | 技术 | 理由 |
|------|------|------|
| 框架 | Vue 3 | 符合项目规范"管理后台用 Vue" |
| UI 库 | Naive UI | Vue 3 生态成熟组件库，支持暗黑模式 |
| 状态管理 | Pinia | Vue 官方推荐，轻量级 |
| 路由 | Vue Router | 标准 Vue 路由方案 |
| 网络请求 | @connectrpc/connect-web | 复用现有 gRPC-Web 基础设施 |
| 图表 | ECharts | 国内生态成熟，文档丰富 |
| 构建 | Vite | 与主站一致 |

### Decision 2: 架构设计 — 独立 APP vs 微前端

**选择独立 APP 方案**，原因：

```
┌─────────────────────────────────────────────────────────────┐
│                     用户访问层                                │
├─────────────────────────────────────────────────────────────┤
│  主站 (luhanxin.com)          管理后台 (admin.luhanxin.com)  │
│  ├─ apps/main (React)         ├─ apps/admin (Vue 3)        │
│  ├─ apps/feed (React)         └─ 内网/VPN 保护               │
│  └─ apps/user-profile (Vue)                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Gateway (Axum)                          │
│  ├─ /api/v1/*          — 主站 API (user role)               │
│  └─ /api/admin/*       — 管理 API (admin role)              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     数据层                                   │
│  ├─ PostgreSQL      — 业务数据                              │
│  ├─ ClickHouse      — 埋点数据                              │
│  ├─ Redis           — 缓存                                  │
│  └─ Prometheus      — 基础设施指标                          │
└─────────────────────────────────────────────────────────────┘
```

**核心隔离原则**：
- Admin Dashboard 不暴露在公网
- 独立域名，独立 TLS 证书
- 独立认证入口（admin 登录页）
- JWT token 带有 `role: admin` 声明

### Decision 3: 目录结构

```
apps/admin/
├── src/
│   ├── main.ts                        # Vite 入口
│   ├── App.vue                        # 根组件
│   ├── views/                         # 页面组件
│   │   ├── Dashboard/
│   │   │   ├── index.vue              # 概览页
│   │   │   ├── components/
│   │   │   │   ├── StatCard.vue       # 统计卡片
│   │   │   │   ├── TrendChart.vue     # 趋势图
│   │   │   │   └── ActiveUsers.vue    # 活跃用户列表
│   │   │   └── dashboard.module.css
│   │   ├── Analytics/
│   │   │   ├── index.vue              # 分析主页
│   │   │   ├── PageViews.vue          # PV/UV 分析
│   │   │   ├── Events.vue             # 自定义事件
│   │   │   ├── Funnels.vue            # 漏斗分析
│   │   │   └── Retention.vue          # 留存分析
│   │   ├── Monitoring/
│   │   │   ├── index.vue              # 监控主页
│   │   │   ├── Errors.vue             # JS 错误列表
│   │   │   ├── ErrorDetail.vue        # 错误详情
│   │   │   ├── Performance.vue        # 性能趋势
│   │   │   ├── Security.vue           # 安全事件
│   │   │   └── Alerts.vue             # 告警规则
│   │   ├── Content/
│   │   │   ├── index.vue              # 内容管理主页
│   │   │   ├── Articles.vue           # 文章审核
│   │   │   ├── ArticleDetail.vue      # 文章详情
│   │   │   ├── Comments.vue           # 评论审核
│   │   │   └── Reports.vue            # 举报处理
│   │   ├── Users/
│   │   │   ├── index.vue              # 用户管理主页
│   │   │   ├── List.vue               # 用户列表
│   │   │   ├── Detail.vue             # 用户详情
│   │   │   └── BanHistory.vue         # 封禁历史
│   │   ├── System/
│   │   │   ├── index.vue              # 系统设置主页
│   │   │   ├── Config.vue             # 全局配置
│   │   │   ├── SensitiveWords.vue     # 敏感词库
│   │   │   ├── Logs.vue               # 操作日志
│   │   │   └── Health.vue             # 服务健康状态
│   │   └── Login.vue                  # 登录页
│   ├── components/                    # 全局公共组件
│   │   ├── Layout/
│   │   │   ├── index.vue              # 布局容器
│   │   │   ├── Sidebar.vue            # 侧边栏
│   │   │   └── Header.vue             # 顶栏
│   │   ├── ErrorBoundary.vue
│   │   └── Loading.vue
│   ├── stores/                        # Pinia stores
│   │   ├── useAuthStore.ts            # 认证状态
│   │   ├── useAnalyticsStore.ts       # 分析数据
│   │   ├── useMonitoringStore.ts      # 监控数据
│   │   └── useUserStore.ts            # 用户管理
│   ├── router/                        # 路由配置
│   │   ├── index.ts                   # Vue Router 实例
│   │   ├── routes.ts                  # 路由表
│   │   └── guards.ts                  # 路由守卫
│   ├── lib/                           # SDK 封装
│   │   ├── connect.ts                 # Connect RPC transport
│   │   └── admin-api.ts               # Admin API 封装
│   ├── composables/                   # Vue composables
│   │   ├── useChartData.ts            # 图表数据处理
│   │   └── usePagination.ts           # 分页逻辑
│   ├── styles/                        # 全局样式
│   │   ├── index.css                  # 入口
│   │   └── variables.css              # CSS 变量
│   └── vite-env.d.ts
├── vite.config.ts                     # Vite 配置
├── tsconfig.json                      # TypeScript 配置
└── package.json
```

### Decision 4: 核心页面设计

#### 4.1 Dashboard 概览页

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                    2026-04-05    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │ PV   │ │ UV   │ │ 错误率│ │活跃用户│                       │
│  │12.5K │ │ 8.2K │ │ 0.3% │ │  156 │                        │
│  │ ↑12% │ │ ↑8%  │ │ ↓2%  │ │ ↑23  │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │  PV/UV 趋势 (近 7 天)                                   ││
│  │  [ECharts 折线图]                                       ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │  Top 文章 (按阅读) │  │  Top 用户 (按活跃)│              │
│  │  1. 文章A (1.2K)  │  │  1. user1 (32篇) │              │
│  │  2. 文章B (0.9K)  │  │  2. user2 (28篇) │              │
│  │  3. 文章C (0.7K)  │  │  3. user3 (21篇) │              │
│  └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Monitoring 错误页

```
┌─────────────────────────────────────────────────────────────┐
│  Monitoring > Errors                                        │
├─────────────────────────────────────────────────────────────┤
│  筛选: [时间范围] [错误类型] [页面]        [搜索]            │
├─────────────────────────────────────────────────────────────┤
│  错误列表                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ TypeError: Cannot read property 'x' of undefined        ││
│  │ 页面: /article/123  |  发生 12 次  |  最后: 2h 前        ││
│  │ [查看详情] [标记已处理]                                  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ NetworkError: Failed to fetch                          ││
│  │ 页面: /search  |  发生 8 次  |  最后: 5h 前             ││
│  │ [查看详情] [标记已处理]                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  分页: [1] 2 3 ... 10                                       │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 Content 审核页

```
┌─────────────────────────────────────────────────────────────┐
│  Content > Articles                                         │
├─────────────────────────────────────────────────────────────┤
│  筛选: [状态: 待审核] [分类] [时间]                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 文章标题: 深入理解 React Hooks                          ││
│  │ 作者: user1  |  提交: 2026-04-05 10:30                  ││
│  │ 摘要: 本文深入探讨 React Hooks 的工作原理...            ││
│  │ [查看全文] [批准] [驳回]                                 ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 文章标题: 2026 年前端趋势预测                           ││
│  │ 作者: user2  |  提交: 2026-04-05 09:15                  ││
│  │ 摘要: 展望 2026 年前端技术的发展...                     ││
│  │ [查看全文] [批准] [驳回]                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Decision 5: API 设计

Gateway 新增 `/api/admin/*` 路由组，需要 `role: admin` 权限：

```rust
// services/gateway/src/routes/admin.rs
pub fn admin_routes() -> Router {
    Router::new()
        // Analytics
        .route("/admin/analytics/overview", get(get_analytics_overview))
        .route("/admin/analytics/pageviews", get(get_pageviews))
        .route("/admin/analytics/events", get(get_custom_events))
        
        // Monitoring
        .route("/admin/monitoring/errors", get(get_errors))
        .route("/admin/monitoring/errors/:id", get(get_error_detail))
        .route("/admin/monitoring/performance", get(get_performance))
        .route("/admin/monitoring/security", get(get_security_events))
        
        // Content
        .route("/admin/content/articles", get(get_articles))
        .route("/admin/content/articles/:id", get(get_article_detail))
        .route("/admin/content/articles/:id/approve", post(approve_article))
        .route("/admin/content/articles/:id/reject", post(reject_article))
        .route("/admin/content/comments", get(get_comments))
        
        // Users
        .route("/admin/users", get(get_users))
        .route("/admin/users/:id", get(get_user_detail))
        .route("/admin/users/:id/ban", post(ban_user))
        .route("/admin/users/:id/unban", post(unban_user))
        
        // System
        .route("/admin/system/config", get(get_config))
        .route("/admin/system/config", post(update_config))
        .route("/admin/system/health", get(get_health))
        .layer(middleware::from_fn(admin_auth_middleware))
}
```

### Decision 6: 认证与权限

**登录流程**：

```
1. 管理员访问 admin.luhanxin.com
2. 输入用户名/密码（与主站同一套账号体系）
3. Gateway 验证账号密码，检查是否具有 admin 角色
4. 返回 JWT token，包含 { role: "admin", userId: "..." }
5. 前端存储 token 到 localStorage
6. 后续请求在 Authorization header 中携带 token
7. Gateway auth interceptor 校验 token + role
```

**权限校验中间件**：

```rust
async fn admin_auth_middleware(
    Extension(claims): Extension<Claims>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if claims.role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(next.run(req).await)
}
```

### Decision 7: 数据可视化集成

**ECharts 配置封装**：

```typescript
// src/composables/useChartData.ts
export function useChartData() {
  const formatTrendData = (data: Array<{ date: string; value: number }>) => {
    return {
      xAxis: data.map(d => d.date),
      series: [{ name: 'PV', data: data.map(d => d.value) }],
    };
  };

  const formatPieData = (data: Array<{ name: string; value: number }>) => {
    return data.map(d => ({ name: d.name, value: d.value }));
  };

  return { formatTrendData, formatPieData };
}
```

**与 ClickHouse 集成**：

Gateway 的 admin API 会查询 ClickHouse 获取埋点数据：

```rust
// services/gateway/src/handlers/admin/analytics.rs
pub async fn get_analytics_overview(
    State(ch_client): State<ClickHouseClient>,
) -> Result<Json<OverviewResponse>, AppError> {
    let pv = ch_client.query_one("SELECT count() FROM events WHERE event = 'page_view' AND date = today()").await?;
    let uv = ch_client.query_one("SELECT uniq(user_id) FROM events WHERE event = 'page_view' AND date = today()").await?;
    // ...
    Ok(Json(OverviewResponse { pv, uv, ... }))
}
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **权限泄露** | admin API 被非管理员访问 | JWT 校验 + role 字段 + 中间件统一拦截 |
| **敏感数据暴露** | 用户邮箱/IP 等信息泄露 | 数据脱敏 + 操作日志审计 |
| **性能瓶颈** | 复杂查询（留存分析）耗时长 | 异步查询 + Loading 状态 + 结果缓存 |
| **维护成本** | 双框架（React+Vue）团队需掌握两套技术栈 | 共享组件提升到 packages/；代码规范统一 |
| **部署复杂度** | 需配置独立域名、TLS、VPN | 使用 CDN 一键配置；内网 IP 白名单 |

## Migration Plan

### Phase 1: 项目骨架搭建 (2d)

- 创建 `apps/admin/` 目录结构
- 配置 Vite + Vue 3 + Naive UI
- 配置 Vue Router + Pinia
- 实现 Layout 布局（Sidebar + Header）
- 实现登录页

### Phase 2: Dashboard 概览页 (3d)

- 实现 StatCard 组件
- 实现 TrendChart 组件（ECharts）
- 对接 `/api/admin/analytics/overview` API
- 实现 Top 文章/Top 用户列表

### Phase 3: Analytics 模块 (5d)

- 实现 PV/UV 分析页
- 实现自定义事件统计页
- 实现漏斗分析页
- 实现留存分析页

### Phase 4: Monitoring 模块 (5d)

- 实现错误列表页
- 实现错误详情页（含 Stack Trace）
- 实现性能趋势页
- 实现安全事件页
- 实现告警规则配置页

### Phase 5: Content 模块 (3d)

- 实现文章审核页
- 实现评论审核页
- 实现举报处理页

### Phase 6: Users 模块 (2d)

- 实现用户列表页
- 实现用户详情页
- 实现封禁功能

### Phase 7: System 模块 (3d)

- 实现全局配置页
- 实现敏感词库管理
- 实现操作日志页
- 实现服务健康状态页

### Phase 8: Gateway Admin API (5d)

- 实现 admin 路由组
- 实现 admin 权限中间件
- 实现各 API 端点
- 对接 ClickHouse 查询

### Phase 9: 部署与安全配置 (2d)

- 配置独立域名 admin.luhanxin.com
- 配置 TLS 证书
- 配置内网访问策略
- 配置 VPN 白名单

## Open Questions（已解决）

1. **Admin 账号如何创建？**
   - ✅ 选择：**CLI 工具优先 + Admin API 辅助**
   - 理由：可维护性高，可自动化，避免手动操作数据库
   - 实现：`cargo run -p svc-user --bin admin-cli create-admin --email admin@example.com`

2. **敏感词库如何更新？**
   - ✅ 选择：**手动添加 + 定期导入第三方词库**
   - 理由：兼顾可控性和完整性，管理员可在后台手动添加，也可导入社区维护的词库

3. **操作日志存储在哪？**
   - ✅ 选择：**PostgreSQL（独立表）**
   - 理由：复用现有数据库，无需新增存储；支持复杂查询和审计
   - 表结构：`admin_logs(id, user_id, action, target, ip, user_agent, created_at)`

4. **告警通知渠道？**
   - ✅ 选择：**邮件（自建邮箱） + 企业微信/钉钉 Webhook（双渠道）**
   - 理由：多渠道通知，确保重要告警不被遗漏；可配置用户偏好

### Decision 8: 自建邮箱服务（@email.luhanxin.com）

**方案选择**：**Mailcow（开源免费，Docker 部署）**

**为什么选 Mailcow？**

| 维度 | Mailcow | 其他方案 |
|------|---------|---------|
| **开源免费** | ✅ AGPL v3 | ✅ Mail-in-a-Box、Mailu |
| **部署方式** | ✅ Docker Compose | ⚠️ Mail-in-a-Box 需要独立服务器 |
| **Web UI** | ✅ 现代化 UI（SOGo） | ⚠️ Mailu UI 较简陋 |
| **防病毒** | ✅ 内置 ClamAV | ⚠️ 需额外配置 |
| **SSL 证书** | ✅ 自动生成 Let's Encrypt | ✅ 多数方案支持 |
| **社区活跃度** | ✅ GitHub 5k+ stars | ⚠️ 其他方案较小 |

**部署架构**：

```yaml
# docker/mailcow/docker-compose.yml
services:
  mailcow:
    image: mailcow/mailcow:latest
    container_name: luhanxin-mail
    ports:
      - "25:25"      # SMTP
      - "465:465"    # SMTPS
      - "587:587"    # Submission
      - "993:993"    # IMAPS
      - "995:995"    # POP3S
    environment:
      - MAILCOW_HOSTNAME=email.luhanxin.com
      - TZ=Asia/Shanghai
    volumes:
      - ./data:/var/vmail
      - ./config:/opt/mailcow/config
    restart: unless-stopped
```

**DNS 配置**：

```dns
# 域名：luhanxin.com
MX      10  email.luhanxin.com.
TXT         "v=spf1 mx a -all"
TXT         "dkim=..." # Mailcow 自动生成

# 域名：email.luhanxin.com
A           <服务器 IP>
AAAA        <服务器 IPv6>
```

**邮箱账号规划**：

| 账号 | 用途 |
|------|------|
| `noreply@email.luhanxin.com` | 系统通知、验证码 |
| `alerts@email.luhanxin.com` | 告警通知 |
| `admin@email.luhanxin.com` | 管理员邮箱 |
| `support@email.luhanxin.com` | 用户支持 |

**与系统集成**：

```rust
// services/gateway/src/email/mod.rs
use lettre::{Message, SmtpTransport, Transport};

pub async fn send_email(
    to: &str,
    subject: &str,
    body: &str,
) -> Result<()> {
    let email = Message::builder()
        .from("noreply@email.luhanxin.com".parse()?)
        .to(to.parse()?)
        .subject(subject)
        .body(body.to_string())?;
    
    let mailer = SmtpTransport::relay("email.luhanxin.com")?
        .credentials(Credentials::new(
            "noreply@email.luhanxin.com".to_string(),
            "password".to_string(),
        ))
        .build();
    
    mailer.send(&email)?;
    Ok(())
}
```

**运维成本**：

| 项目 | 成本 |
|------|------|
| **软件授权** | 零成本（开源免费） |
| **服务器** | 1 核 2GB（小型社区足够） |
| **域名** | 已有（luhanxin.com） |
| **SSL 证书** | 零成本（Let's Encrypt 自动） |
| **运维人力** | 低（Mailcow 自动化程度高） |

**性能基准**：

| 指标 | 数值 |
|------|------|
| **日发送量** | 10,000+ 封 |
| **存储空间** | 可扩展（依赖磁盘） |
| **并发连接** | 100+ |
