## Why

当前平台完全没有埋点和监控系统。无法回答以下关键业务问题：

1. **用户行为** — 哪些文章最热门？用户在哪些页面停留时间最长？跳出率是多少？
2. **功能使用** — 编辑器的使用频率？搜索关键词分布？评论交互率？
3. **性能监控** — 页面加载时间分布？API 响应时间？Core Web Vitals？
4. **错误追踪** — 前端 JS 错误分布？后端 panic 频率？错误趋势？
5. **安全监控** — 是否有 XSS 攻击尝试？认证异常？API 滥用？
6. **用户画像** — 活跃用户分布？新用户留存？设备/浏览器分布？

需要一个自研的**统一监控系统**，涵盖前端埋点、后端采集、安全监控和基础设施监控：

```
┌─ 前端监控 (@luhanxin/tracker SDK) ─────────────────┐
│  ├─ 性能监控: Core Web Vitals, Long Tasks          │
│  ├─ 错误监控: JS Errors, Unhandled Rejections      │
│  ├─ 行为埋点: Page View, Custom Events             │
│  ├─ 安全监控: CSP Violations, Suspicious Inputs    │
│  └─ [预留] 会话录制: rrweb 接口（可选模块）          │
└───────────────────────────────────────────────────┘
                      ↓ HTTPS
┌─ 后端采集 (svc-analytics) ─────────────────────────┐
│  ├─ 事件写入: ClickHouse                           │
│  ├─ 告警引擎: Prometheus AlertManager              │
│  └─ [预留] 会话存储: S3/MinIO (rrweb 录制文件)      │
└───────────────────────────────────────────────────┘
                      ↓
┌─ 基础设施监控 (Prometheus + Grafana) ─────────────┐
│  ├─ 主机指标: CPU/Memory/Disk/Network              │
│  ├─ 服务指标: QPS/Latency/ErrorRate/QueueDepth     │
│  └─ 中间件: PostgreSQL/Redis/NATS/Consul 健康状态  │
└───────────────────────────────────────────────────┘
```

## What Changes

### 前端埋点 SDK（`@luhanxin/tracker`）

- **性能监控**：Core Web Vitals（FCP/LCP/CLS/INP/TTFB）、Long Tasks
- **错误监控**：JS Errors、Unhandled Rejections、资源加载失败
- **行为埋点**：Page View、路由跳转、自定义事件
- **安全监控**：CSP Violations、可疑输入检测、异常行为标记
- **预留接口**：rrweb 会话录制接口（Observer 模式，初期不实现）
- **批量上报**：本地缓冲 + 批量发送（减少请求次数）
- **离线支持**：localStorage 缓冲，网络恢复后重发

### 后端采集服务（`services/svc-analytics`）

- **事件接收**：HTTP 端点接收埋点数据（Protobuf）
- **ClickHouse 写入**：事件表 + 会话表 + 安全事件表
- **采样率控制**：高流量时自动降采样
- **告警规则**：错误率、性能异常、安全事件触发告警

### 安全监控

- **CSP 违规上报**：`Content-Security-Policy-Report-Only` 违规自动上报
- **认证异常检测**：登录失败率监控、异地登录告警
- **API 滥用检测**：请求频率异常、爬虫行为识别
- **内容安全信号**：敏感词触发、举报事件统计

### 基础设施监控（Prometheus + Grafana）

- **主机指标**：CPU、Memory、Disk、Network
- **服务指标**：QPS、Latency、ErrorRate、QueueDepth
- **中间件监控**：PostgreSQL、Redis、NATS、Consul 健康状态
- **Grafana Dashboard**：统一可视化看板

### 告警

- **错误告警**：JS 错误率超过阈值
- **性能告警**：页面加载时间异常、API 响应时间异常
- **安全告警**：CSP 违规频率异常、认证失败率异常
- **基础设施告警**：CPU/内存使用率过高、磁盘空间不足

## 非目标 (Non-goals)

- **不做 A/B 测试框架** — 后续 change 设计
- **不做实时大屏** — 本次仅 Grafana Dashboard
- **不做 rrweb 会话录制实现** — 仅预留接口，未来作为可选模块
- **不做日志聚合** — ELK/Loki 不在范围
- **不做 WAF（Web 应用防火墙）** — 安全监控仅做信号采集，不做实时拦截

## 与现有设计文档的关系

- **`docs/design/2026-03-20/05-infrastructure.md`** — 新增 ClickHouse + Grafana + Prometheus
- **`docs/design/2026-03-20/03-backend-architecture.md`** — 新增 svc-analytics 微服务
- **`openspec/changes/headless-browser-screenshot/`** — 告警触发时可调用截图服务留证
- **`openspec/changes/admin-dashboard/`** — 监控数据在管理后台可视化

## Capabilities

### New Capabilities

- `tracker-sdk`: 前端埋点 SDK — 性能监控 + 错误监控 + 行为埋点 + 安全监控 + rrweb 预留接口
- `analytics-service`: 数据采集服务 — 接收埋点 + 写入 ClickHouse + 告警规则
- `security-monitoring`: 安全监控 — CSP 违规上报 + 认证异常检测 + API 滥用检测
- `infrastructure-monitoring`: 基础设施监控 — Prometheus 指标采集 + Grafana Dashboard
- `unified-monitoring-architecture`: 统一监控架构 — 前端 + 后端 + 基础设施三层监控

## Impact

### 新增基础设施

| 组件 | 说明 |
|------|------|
| ClickHouse | 列式时序数据库，存储埋点数据和安全事件 |
| Grafana | 可视化看板 |
| Prometheus | 基础设施指标采集 |
| AlertManager | 告警管理 |
| svc-analytics | Rust 后端采集服务 |

### 代码影响

- 新增 `packages/tracker/` — 前端 SDK（含安全监控 + rrweb 预留接口）
- 新增 `services/svc-analytics/` — 后端采集服务
- 修改 `docker/docker-compose.yml` — 新增 ClickHouse/Grafana/Prometheus/AlertManager 容器
- 修改 `apps/main/` — 集成 tracker SDK
- 修改 Gateway — 新增 CSP header + 安全事件上报路由

### Proto 影响

新增 `analytics.proto` — 定义埋点事件类型 + 安全事件类型

### 配置影响

- 新增 CSP（Content-Security-Policy）配置
- 新增 Prometheus scrape targets
- 新增 AlertManager 告警规则
