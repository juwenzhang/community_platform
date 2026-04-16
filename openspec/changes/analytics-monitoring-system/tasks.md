## 任务拆分

### Phase 1: Proto 定义 + 基础设施

#### Task 1.1: 创建 analytics.proto

**描述**: 定义埋点事件和安全事件的 Proto 消息

**文件**:
- `proto/luhanxin/community/v1/analytics.proto`

**验收标准**:
- [ ] 定义 AnalyticsEvent、SecurityEvent、SessionRecording 消息
- [ ] 定义 EventType、SecurityEventType 枚举
- [ ] 执行 `make proto` 成功

**预估时长**: 2h

---

#### Task 1.2: 新增基础设施容器

**描述**: 在 docker-compose.yml 中新增 ClickHouse、Grafana、Prometheus、AlertManager

**文件**:
- `docker/docker-compose.yml`
- `docker/grafana/provisioning/datasources.yml`
- `docker/prometheus/prometheus.yml`
- `docker/alertmanager/config.yml`

**验收标准**:
- [ ] ClickHouse 容器运行正常（端口 8123/9000）
- [ ] Grafana 容器运行正常（端口 3000）
- [ ] Prometheus 容器运行正常（端口 9090）
- [ ] AlertManager 容器运行正常（端口 9093）

**预估时长**: 3h

---

#### Task 1.3: 创建 ClickHouse 表

**描述**: 创建事件表、安全事件表、会话表

**文件**:
- `docker/clickhouse/init.sql`

**验收标准**:
- [ ] events 表创建成功
- [ ] security_events 表创建成功
- [ ] sessions 表创建成功
- [ ] session_recordings 表创建成功（预留）

**预估时长**: 2h

---

### Phase 2: 前端 SDK（核心）

#### Task 2.1: 创建 SDK 基础结构

**描述**: 创建 @luhanxin/tracker 包基础结构

**文件**:
- `packages/tracker/package.json`
- `packages/tracker/tsconfig.json`
- `packages/tracker/src/index.ts`

**验收标准**:
- [ ] 包结构创建完成
- [ ] TypeScript 配置正确
- [ ] 导出 API 清晰

**预估时长**: 1h

---

#### Task 2.2: 实现 Tracker 核心类

**描述**: 实现 Tracker 类（初始化、配置、批量上报）

**文件**:
- `packages/tracker/src/core/tracker.ts`
- `packages/tracker/src/core/queue.ts`
- `packages/tracker/src/core/transport.ts`

**验收标准**:
- [ ] 初始化配置正确
- [ ] 批量上报逻辑正常
- [ ] 离线缓冲正常

**预估时长**: 4h

---

#### Task 2.3: 实现自动性能采集

**描述**: 实现 Core Web Vitals 自动采集

**文件**:
- `packages/tracker/src/plugins/performance.ts`

**验收标准**:
- [ ] FCP/LCP/CLS/INP/TTFB 自动采集
- [ ] 数据上报正确

**预估时长**: 3h

---

#### Task 2.4: 实现自动错误采集

**描述**: 实现 JS 错误和 Unhandled Rejection 自动采集

**文件**:
- `packages/tracker/src/plugins/error.ts`

**验收标准**:
- [ ] window.onerror 自动捕获
- [ ] unhandledrejection 自动捕获
- [ ] 资源加载错误自动捕获

**预估时长**: 3h

---

#### Task 2.5: 实现自动页面浏览采集

**描述**: 实现 PV/UV 和路由跳转自动采集

**文件**:
- `packages/tracker/src/plugins/page-view.ts`

**验收标准**:
- [ ] 页面浏览自动采集
- [ ] 路由跳转自动采集
- [ ] 页面停留时间计算正确

**预估时长**: 3h

---

#### Task 2.6: 实现手动埋点 API

**描述**: 实现 track/trackTime/identify 等 API

**文件**:
- `packages/tracker/src/api/track.ts`

**验收标准**:
- [ ] track() API 正常
- [ ] trackTime() API 正常
- [ ] identify() API 正常

**预估时长**: 2h

---

### Phase 3: 安全监控

#### Task 3.1: 实现 CSP 违规捕获

**描述**: 实现前端 CSP violation 事件捕获

**文件**:
- `packages/tracker/src/plugins/security/csp.ts`

**验收标准**:
- [ ] securitypolicyviolation 事件自动捕获
- [ ] 数据上报到 /api/v1/analytics/security/csp

**预估时长**: 2h

---

#### Task 3.2: 实现可疑输入检测

**描述**: 实现前端可疑输入检测（XSS payload）

**文件**:
- `packages/tracker/src/plugins/security/input.ts`

**验收标准**:
- [ ] 检测常见的 XSS payload 模式
- [ ] 上报可疑输入事件

**预估时长**: 3h

---

#### Task 3.3: Gateway CSP Header 配置

**描述**: 在 Gateway 中配置 CSP Report-Only header

**文件**:
- `services/gateway/src/middleware/csp.rs`

**验收标准**:
- [ ] CSP header 正确设置
- [ ] Report-URI 指向安全事件端点

**预估时长**: 2h

---

#### Task 3.4: 实现认证异常监控

**描述**: 在 Gateway 中实现认证失败事件上报

**文件**:
- `services/gateway/src/handlers/auth.rs`

**验收标准**:
- [ ] 认证失败事件上报
- [ ] 异地登录检测（可选）

**预估时长**: 3h

---

#### Task 3.5: 实现 API 滥用监控

**描述**: 在 Gateway 中实现请求频率监控

**文件**:
- `services/gateway/src/middleware/rate_limit.rs`

**验收标准**:
- [ ] Redis 计数器正常工作
- [ ] 超限请求触发安全事件上报

**预估时长**: 3h

---

### Phase 4: rrweb 预留接口

#### Task 4.1: 创建 SessionReplay 类型定义

**描述**: 定义 rrweb 相关类型和接口

**文件**:
- `packages/tracker/src/session-replay/types.ts`

**验收标准**:
- [ ] SessionReplayObserver 接口定义完整
- [ ] SessionReplayConfig 类型定义

**预估时长**: 1h

---

#### Task 4.2: 实现 SessionReplay 空实现

**描述**: 实现 SessionReplay 类的空实现（初期不加载 rrweb）

**文件**:
- `packages/tracker/src/session-replay/index.ts`

**验收标准**:
- [ ] start/stop/getEvents/upload 方法实现（空实现或预留）
- [ ] enabled=false 时不加载 rrweb

**预估时长**: 2h

---

#### Task 4.3: 编写 SessionReplay 文档

**描述**: 编写 SessionReplay 使用文档（未来启用指南）

**文件**:
- `packages/tracker/README.md`

**验收标准**:
- [ ] 说明 SessionReplay 是可选模块
- [ ] 说明启用条件和配置方法

**预估时长**: 1h

---

### Phase 5: 后端采集服务

#### Task 5.1: 创建 svc-analytics 骨架

**描述**: 创建 svc-analytics 微服务基础结构

**文件**:
- `services/svc-analytics/Cargo.toml`
- `services/svc-analytics/src/main.rs`
- `services/svc-analytics/src/config.rs`

**验收标准**:
- [ ] 服务骨架创建完成
- [ ] ClickHouse 连接配置正确

**预估时长**: 2h

---

#### Task 5.2: 实现事件采集端点

**描述**: 实现 /api/v1/analytics/collect HTTP 端点

**文件**:
- `services/svc-analytics/src/routes/collect.rs`

**验收标准**:
- [ ] Protobuf 反序列化正常
- [ ] 批量写入 ClickHouse 正常
- [ ] 采样率控制正常

**预估时长**: 4h

---

#### Task 5.3: 实现安全事件端点

**描述**: 实现 /api/v1/analytics/security/* 端点

**文件**:
- `services/svc-analytics/src/routes/security.rs`

**验收标准**:
- [ ] CSP 违规上报端点正常
- [ ] 安全事件写入 ClickHouse 正常

**预估时长**: 3h

---

#### Task 5.4: 在 Gateway 中添加路由转发

**描述**: 在 Gateway 中添加 analytics 路由转发

**文件**:
- `services/gateway/src/routes/analytics.rs`

**验收标准**:
- [ ] /api/v1/analytics/* 转发到 svc-analytics
- [ ] 服务发现正常

**预估时长**: 2h

---

### Phase 6: 基础设施监控（Prometheus）

#### Task 6.1: 配置 Prometheus Exporters

**描述**: 配置各组件的 Prometheus Exporter

**文件**:
- `docker/docker-compose.yml` — 新增 postgres-exporter、redis-exporter、clickhouse-exporter、node-exporter
- `docker/prometheus/prometheus.yml`

**验收标准**:
- [ ] PostgreSQL Exporter 正常
- [ ] Redis Exporter 正常
- [ ] ClickHouse Exporter 正常
- [ ] Node Exporter 正常

**预估时长**: 3h

---

#### Task 6.2: 在服务中暴露 Prometheus 指标

**描述**: 在 Gateway 和微服务中暴露 /metrics 端点

**文件**:
- `services/gateway/src/routes/metrics.rs`
- `services/svc-user/src/routes/metrics.rs`

**验收标准**:
- [ ] /metrics 端点正常
- [ ] Prometheus 指标格式正确

**预估时长**: 3h

---

### Phase 7: Grafana Dashboard

#### Task 7.1: 创建概览看板

**描述**: 创建 PV/UV、错误率、QPS 统一看板

**文件**:
- `docker/grafana/dashboards/overview.json`

**验收标准**:
- [ ] PV/UV 趋势图正常
- [ ] 实时在线用户数正常
- [ ] 错误率图正常

**预估时长**: 3h

---

#### Task 7.2: 创建性能看板

**描述**: 创建 Core Web Vitals 和 API Latency 看板

**文件**:
- `docker/grafana/dashboards/performance.json`

**验收标准**:
- [ ] FCP/LCP/CLS/INP 分布图正常
- [ ] API Latency P50/P75/P95 正常

**预估时长**: 3h

---

#### Task 7.3: 创建错误看板

**描述**: 创建 JS 错误监控看板

**文件**:
- `docker/grafana/dashboards/errors.json`

**验收标准**:
- [ ] 错误列表正常
- [ ] 错误趋势图正常
- [ ] TOP 错误正常

**预估时长**: 2h

---

#### Task 7.4: 创建安全看板

**描述**: 创建安全事件监控看板

**文件**:
- `docker/grafana/dashboards/security.json`

**验收标准**:
- [ ] CSP 违规事件正常
- [ ] 认证失败事件正常
- [ ] API 滥用事件正常

**预估时长**: 2h

---

#### Task 7.5: 创建基础设施看板

**描述**: 创建主机和服务监控看板

**文件**:
- `docker/grafana/dashboards/infrastructure.json`

**验收标准**:
- [ ] CPU/Memory/Disk 图正常
- [ ] 服务健康状态正常

**预估时长**: 2h

---

### Phase 8: 告警

#### Task 8.1: 配置 AlertManager 规则

**描述**: 配置前端、安全、基础设施告警规则

**文件**:
- `docker/alertmanager/rules.yml`

**验收标准**:
- [ ] 前端告警规则正常
- [ ] 安全告警规则正常
- [ ] 基础设施告警规则正常

**预估时长**: 2h

---

#### Task 8.2: 配置告警通知渠道

**描述**: 配置邮件通知（预留企业微信/钉钉）

**文件**:
- `docker/alertmanager/config.yml`

**验收标准**:
- [ ] 邮件通知正常
- [ ] Webhook 预留配置

**预估时长**: 1h

---

### Phase 9: 前端集成

#### Task 9.1: 在主站中集成 SDK

**描述**: 在 apps/main 中集成 @luhanxin/tracker

**文件**:
- `apps/main/src/main.tsx`

**验收标准**:
- [ ] SDK 初始化正常
- [ ] 自动采集正常
- [ ] 手动埋点正常

**预估时长**: 2h

---

#### Task 9.2: 在管理后台中集成 SDK

**描述**: 在 apps/admin 中集成 @luhanxin/tracker

**文件**:
- `apps/admin/src/main.ts`

**验收标准**:
- [ ] SDK 初始化正常
- [ ] 自动采集正常

**预估时长**: 1h

---

#### Task 9.3: 手动埋点关键事件

**描述**: 在关键操作中添加手动埋点

**文件**:
- `apps/main/src/pages/post/pages/edit/index.tsx` — 文章发布埋点
- `apps/main/src/components/CommentSection.tsx` — 评论提交埋点
- `apps/main/src/pages/search/index.tsx` — 搜索执行埋点

**验收标准**:
- [ ] 文章发布事件上报正常
- [ ] 评论提交事件上报正常
- [ ] 搜索执行事件上报正常

**预估时长**: 3h

---

### Phase 10: 验证与文档

#### Task 10.1: SDK 功能测试

**描述**: 测试 SDK 所有功能

**验收标准**:
- [ ] 自动采集测试通过
- [ ] 手动埋点测试通过
- [ ] 安全监控测试通过
- [ ] 离线缓冲测试通过

**预估时长**: 3h

---

#### Task 10.2: 端到端测试

**描述**: 测试完整的监控链路

**验收标准**:
- [ ] 埋点 → 采集 → ClickHouse → Grafana 显示正常
- [ ] 安全事件 → ClickHouse → Grafana 显示正常
- [ ] 告警触发 → 邮件通知正常

**预估时长**: 3h

---

#### Task 10.3: 更新文档

**描述**: 更新项目文档

**文件**:
- `README.md` — 端口表新增
- `docs/tech/` — 新增监控技术调研文档

**验收标准**:
- [ ] 端口表更新
- [ ] 技术文档更新

**预估时长**: 2h

---

## 总计

- **Proto + 基础设施**: ~7h
- **前端 SDK（核心）**: ~16h
- **安全监控**: ~13h
- **rrweb 预留接口**: ~4h
- **后端采集服务**: ~11h
- **基础设施监控**: ~6h
- **Grafana Dashboard**: ~12h
- **告警**: ~3h
- **前端集成**: ~6h
- **验证与文档**: ~8h
- **总时长**: ~86h（约 11 个工作日）
