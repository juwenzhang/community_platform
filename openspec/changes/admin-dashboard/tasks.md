## 任务拆分

### Phase 1: 项目骨架搭建 (2d)

#### Task 1.1: 创建 apps/admin 目录结构

**描述**: 创建 Vue 3 项目基础结构

**验收标准**:
- [ ] `apps/admin/` 目录创建完成
- [ ] `package.json` 配置正确（依赖 vue、naive-ui、pinia、vue-router 等）
- [ ] `vite.config.ts` 配置正确（端口 5178）
- [ ] `tsconfig.json` 配置正确
- [ ] `pnpm install` 成功

**命令**:
```bash
mkdir -p apps/admin/src/{views,components,stores,router,lib,composables,styles}
cd apps/admin
pnpm init
pnpm add vue naive-ui pinia vue-router @connectrpc/connect-web @connectrpc/connect echarts
pnpm add -D vite @vitejs/plugin-vue typescript
```

**预估时长**: 1h

---

#### Task 1.2: 配置 Vue Router + Pinia

**描述**: 配置路由和状态管理

**文件**:
- `apps/admin/src/router/index.ts` — Vue Router 实例
- `apps/admin/src/router/routes.ts` — 路由表
- `apps/admin/src/router/guards.ts` — 路由守卫
- `apps/admin/src/stores/index.ts` — Pinia 实例

**验收标准**:
- [ ] 路由配置正确
- [ ] 路由守卫实现（未登录跳转到登录页）
- [ ] Pinia store 初始化成功

**预估时长**: 2h

---

#### Task 1.3: 实现 Layout 布局

**描述**: 实现管理后台布局组件

**文件**:
- `apps/admin/src/components/Layout/index.vue` — 布局容器
- `apps/admin/src/components/Layout/Sidebar.vue` — 侧边栏
- `apps/admin/src/components/Layout/Header.vue` — 顶栏

**验收标准**:
- [ ] 使用 Naive UI `n-layout` 组件
- [ ] 侧边栏显示菜单（Dashboard、Analytics、Monitoring、Content、Users、System）
- [ ] 顶栏显示用户信息和退出按钮
- [ ] 响应式布局（最小宽度 1200px）

**预估时长**: 4h

---

#### Task 1.4: 实现登录页

**描述**: 实现管理员登录页面

**文件**:
- `apps/admin/src/views/Login.vue`
- `apps/admin/src/stores/useAuthStore.ts`

**验收标准**:
- [ ] 登录表单（用户名/密码）
- [ ] 调用 `/api/admin/login` API
- [ ] JWT token 存储到 localStorage
- [ ] 登录成功跳转到 Dashboard

**预估时长**: 3h

---

### Phase 2: Dashboard 概览页 (3d)

#### Task 2.1: 实现 StatCard 组件

**描述**: 实现统计卡片组件

**文件**:
- `apps/admin/src/views/Dashboard/components/StatCard.vue`

**验收标准**:
- [ ] 显示标题、数值、变化趋势
- [ ] 支持↑/↓箭头和颜色
- [ ] 支持自定义图标

**预估时长**: 2h

---

#### Task 2.2: 实现 TrendChart 组件

**描述**: 实现趋势图组件（ECharts）

**文件**:
- `apps/admin/src/views/Dashboard/components/TrendChart.vue`
- `apps/admin/src/composables/useChartData.ts`

**验收标准**:
- [ ] 使用 ECharts 渲染折线图
- [ ] 支持多系列数据（PV/UV）
- [ ] 支持 Tooltip 和 Legend
- [ ] 响应式尺寸

**预估时长**: 4h

---

#### Task 2.3: 实现 Dashboard 页面

**描述**: 实现概览页

**文件**:
- `apps/admin/src/views/Dashboard/index.vue`

**验收标准**:
- [ ] 显示 4 个 StatCard（PV/UV/错误率/活跃用户）
- [ ] 显示 PV/UV 趋势图（近 7 天）
- [ ] 显示 Top 文章列表（按阅读量）
- [ ] 显示 Top 用户列表（按活跃度）

**API**:
- `GET /api/admin/analytics/overview`

**预估时长**: 6h

---

### Phase 3: Analytics 模块 (5d)

#### Task 3.1: 实现 PV/UV 分析页

**描述**: 实现页面访问量分析

**文件**:
- `apps/admin/src/views/Analytics/PageViews.vue`

**验收标准**:
- [ ] 时间范围选择器（今日/7天/30天）
- [ ] PV/UV 趋势图
- [ ] Top 页面列表（按访问量）

**API**:
- `GET /api/admin/analytics/pageviews`

**预估时长**: 4h

---

#### Task 3.2: 实现自定义事件统计页

**描述**: 实现自定义埋点事件统计

**文件**:
- `apps/admin/src/views/Analytics/Events.vue`

**验收标准**:
- [ ] 事件列表（按发生次数排序）
- [ ] 事件趋势图
- [ ] 事件详情（按用户/页面分组）

**API**:
- `GET /api/admin/analytics/events`

**预估时长**: 4h

---

#### Task 3.3: 实现漏斗分析页

**描述**: 实现转化漏斗

**文件**:
- `apps/admin/src/views/Analytics/Funnels.vue`

**验收标准**:
- [ ] 漏斗步骤配置
- [ ] 漏斗可视化（柱状图）
- [ ] 转化率显示

**预估时长**: 6h

---

#### Task 3.4: 实现留存分析页

**描述**: 实现用户留存分析

**文件**:
- `apps/admin/src/views/Analytics/Retention.vue`

**验收标准**:
- [ ] 留存表（热力图）
- [ ] 留存曲线图

**预估时长**: 6h

---

### Phase 4: Monitoring 模块 (5d)

#### Task 4.1: 实现错误列表页

**描述**: 实现 JS 错误列表

**文件**:
- `apps/admin/src/views/Monitoring/Errors.vue`

**验收标准**:
- [ ] 错误列表（分页）
- [ ] 筛选器（时间范围/错误类型/页面）
- [ ] 标记已处理按钮

**API**:
- `GET /api/admin/monitoring/errors`

**预估时长**: 4h

---

#### Task 4.2: 实现错误详情页

**描述**: 实现错误详情查看

**文件**:
- `apps/admin/src/views/Monitoring/ErrorDetail.vue`

**验收标准**:
- [ ] 显示错误 Stack Trace
- [ ] 显示错误发生上下文（用户信息/浏览器/URL）
- [ ] 显示错误趋势图

**API**:
- `GET /api/admin/monitoring/errors/:id`

**预估时长**: 4h

---

#### Task 4.3: 实现性能趋势页

**描述**: 实现性能监控

**文件**:
- `apps/admin/src/views/Monitoring/Performance.vue`

**验收标准**:
- [ ] Core Web Vitals 趋势图（LCP/FID/CLS）
- [ ] 性能评分分布

**API**:
- `GET /api/admin/monitoring/performance`

**预估时长**: 4h

---

#### Task 4.4: 实现安全事件页

**描述**: 实现安全事件监控

**文件**:
- `apps/admin/src/views/Monitoring/Security.vue`

**验收标准**:
- [ ] 安全事件列表（CSP 违规/异常登录/API 滥用）
- [ ] 事件详情查看

**API**:
- `GET /api/admin/monitoring/security`

**预估时长**: 4h

---

#### Task 4.5: 实现告警规则配置页

**描述**: 实现告警规则管理

**文件**:
- `apps/admin/src/views/Monitoring/Alerts.vue`

**验收标准**:
- [ ] 告警规则列表
- [ ] 新增/编辑规则表单
- [ ] 规则开关

**预估时长**: 4h

---

### Phase 5: Content 模块 (3d)

#### Task 5.1: 实现文章审核页

**描述**: 实现文章审核列表

**文件**:
- `apps/admin/src/views/Content/Articles.vue`
- `apps/admin/src/views/Content/ArticleDetail.vue`

**验收标准**:
- [ ] 待审核文章列表
- [ ] 文章详情查看
- [ ] 批准/驳回操作

**API**:
- `GET /api/admin/content/articles`
- `POST /api/admin/content/articles/:id/approve`
- `POST /api/admin/content/articles/:id/reject`

**预估时长**: 4h

---

#### Task 5.2: 实现评论审核页

**描述**: 实现评论审核

**文件**:
- `apps/admin/src/views/Content/Comments.vue`

**验收标准**:
- [ ] 待审核评论列表
- [ ] 删除/通过操作

**API**:
- `GET /api/admin/content/comments`

**预估时长**: 3h

---

#### Task 5.3: 实现举报处理页

**描述**: 实现举报管理

**文件**:
- `apps/admin/src/views/Content/Reports.vue`

**验收标准**:
- [ ] 举报列表（文章/评论）
- [ ] 处理操作（忽略/删除内容/封禁用户）

**预估时长**: 3h

---

### Phase 6: Users 模块 (2d)

#### Task 6.1: 实现用户列表页

**描述**: 实现用户管理列表

**文件**:
- `apps/admin/src/views/Users/List.vue`

**验收标准**:
- [ ] 用户列表（分页）
- [ ] 搜索（用户名/邮箱）
- [ ] 状态筛选（正常/封禁）

**API**:
- `GET /api/admin/users`

**预估时长**: 3h

---

#### Task 6.2: 实现用户详情页

**描述**: 实现用户详情查看

**文件**:
- `apps/admin/src/views/Users/Detail.vue`

**验收标准**:
- [ ] 用户基本信息
- [ ] 用户文章/评论列表
- [ ] 封禁/解封按钮

**API**:
- `GET /api/admin/users/:id`
- `POST /api/admin/users/:id/ban`
- `POST /api/admin/users/:id/unban`

**预估时长**: 4h

---

### Phase 7: System 模块 (3d)

#### Task 7.1: 实现全局配置页

**描述**: 实现系统配置管理

**文件**:
- `apps/admin/src/views/System/Config.vue`

**验收标准**:
- [ ] 配置项表单（站点名称/SEO 信息/功能开关）
- [ ] 保存配置

**API**:
- `GET /api/admin/system/config`
- `POST /api/admin/system/config`

**预估时长**: 4h

---

#### Task 7.2: 实现敏感词库管理

**描述**: 实现敏感词管理

**文件**:
- `apps/admin/src/views/System/SensitiveWords.vue`

**验收标准**:
- [ ] 敏感词列表
- [ ] 新增/删除敏感词
- [ ] 导入词库

**预估时长**: 3h

---

#### Task 7.3: 实现操作日志页

**描述**: 实现操作日志查看

**文件**:
- `apps/admin/src/views/System/Logs.vue`

**验收标准**:
- [ ] 日志列表（管理员操作记录）
- [ ] 筛选（操作类型/时间范围）

**预估时长**: 3h

---

#### Task 7.4: 实现服务健康状态页

**描述**: 实现服务健康监控

**文件**:
- `apps/admin/src/views/System/Health.vue`

**验收标准**:
- [ ] 服务状态列表（Gateway、svc-user、svc-content 等）
- [ ] 数据库/缓存状态
- [ ] Prometheus 指标集成

**预估时长**: 4h

---

### Phase 8: Gateway Admin API (5d)

#### Task 8.1: 实现 admin 路由组

**描述**: 在 Gateway 中实现 admin API 路由

**文件**:
- `services/gateway/src/routes/admin.rs`
- `services/gateway/src/handlers/admin/mod.rs`

**验收标准**:
- [ ] admin 路由组定义完成
- [ ] 挂载到 `/api/admin/*` 路径

**预估时长**: 2h

---

#### Task 8.2: 实现 admin 权限中间件

**描述**: 实现 admin 角色校验中间件

**文件**:
- `services/gateway/src/middleware/admin_auth.rs`

**验收标准**:
- [ ] 校验 JWT token
- [ ] 校验 `role: admin` 字段
- [ ] 非 admin 返回 403

**预估时长**: 3h

---

#### Task 8.3: 实现 Analytics API

**描述**: 实现 analytics 相关 API

**文件**:
- `services/gateway/src/handlers/admin/analytics.rs`

**验收标准**:
- [ ] `GET /api/admin/analytics/overview`
- [ ] `GET /api/admin/analytics/pageviews`
- [ ] `GET /api/admin/analytics/events`
- [ ] 对接 ClickHouse 查询

**预估时长**: 6h

---

#### Task 8.4: 实现 Monitoring API

**描述**: 实现 monitoring 相关 API

**文件**:
- `services/gateway/src/handlers/admin/monitoring.rs`

**验收标准**:
- [ ] `GET /api/admin/monitoring/errors`
- [ ] `GET /api/admin/monitoring/errors/:id`
- [ ] `GET /api/admin/monitoring/performance`
- [ ] `GET /api/admin/monitoring/security`

**预估时长**: 6h

---

#### Task 8.5: 实现 Content & Users API

**描述**: 实现 content 和 users 相关 API

**文件**:
- `services/gateway/src/handlers/admin/content.rs`
- `services/gateway/src/handlers/admin/users.rs`

**验收标准**:
- [ ] Content: articles/comments/reports API
- [ ] Users: list/detail/ban/unban API
- [ ] 对接 PostgreSQL

**预估时长**: 6h

---

#### Task 8.6: 实现 System API

**描述**: 实现 system 相关 API

**文件**:
- `services/gateway/src/handlers/admin/system.rs`

**验收标准**:
- [ ] `GET /api/admin/system/config`
- [ ] `POST /api/admin/system/config`
- [ ] `GET /api/admin/system/health`
- [ ] `GET /api/admin/system/logs`

**预估时长**: 4h

---

### Phase 9: 部署与安全配置 (2d)

#### Task 9.1: 配置独立域名和 TLS

**描述**: 配置 admin.luhanxin.com 域名和证书

**验收标准**:
- [ ] DNS 解析配置完成
- [ ] TLS 证书配置完成（Let's Encrypt）
- [ ] HTTPS 访问正常

**预估时长**: 2h

---

#### Task 9.2: 配置内网访问策略

**描述**: 配置内网访问白名单

**验收标准**:
- [ ] Nginx 配置 IP 白名单
- [ ] 或配置 VPN 访问策略
- [ ] 外网访问返回 403

**预估时长**: 2h

---

#### Task 9.3: 配置监控和告警

**描述**: 配置 Admin Dashboard 自身的监控

**验收标准**:
- [ ] Prometheus 监控 admin 前端性能
- [ ] 错误上报到自建错误追踪系统（ClickHouse）
- [ ] 服务不可用告警

**预估时长**: 2h

---

#### Task 9.4: 编写部署文档

**描述**: 编写部署和运维文档

**文件**:
- `docs/deployment/admin-dashboard.md`

**验收标准**:
- [ ] 部署步骤清晰
- [ ] 安全配置说明完整
- [ ] 常见问题解答

**预估时长**: 2h

---

## 总计

- **前端开发**: ~30h
- **后端开发**: ~27h
- **部署配置**: ~8h
- **总时长**: ~65h（约 8 个工作日）
