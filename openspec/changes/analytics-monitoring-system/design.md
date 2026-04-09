## Context

平台当前无任何埋点和监控能力。需要从零建设完整的「采集 → 存储 → 可视化 → 告警」链路。

**统一监控架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                     用户访问层                                │
├─────────────────────────────────────────────────────────────┤
│  主站 (luhanxin.com)          管理后台 (admin.luhanxin.com)  │
│  └─ @luhanxin/tracker         └─ @luhanxin/tracker          │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                  Gateway (Axum)                             │
│  ├─ /api/v1/analytics/*  → svc-analytics                   │
│  ├─ CSP Report-Only header                                 │
│  └─ 安全事件上报端点                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              svc-analytics (Rust)                           │
│  ├─ ClickHouse 写入（事件 + 安全事件）                       │
│  ├─ 采样率控制                                               │
│  └─ 告警触发                                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  数据存储层                                  │
│  ├─ ClickHouse  — 事件表 + 会话表 + 安全事件表               │
│  ├─ Prometheus  — 基础设施指标                              │
│  └─ S3/MinIO   — [预留] rrweb 会话录制文件                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              可视化与告警层                                   │
│  ├─ Grafana Dashboard — 统一看板                            │
│  ├─ AlertManager — 告警路由                                 │
│  └─ Admin Dashboard — 管理后台监控页                         │
└─────────────────────────────────────────────────────────────┘
```

技术栈约束：
- 使用 ClickHouse（列式存储，高效时序分析）
- 不使用 Sentry（自建方案）
- 前端 SDK 遵循 `@luhanxin/` 命名规范
- 基础设施监控使用 Prometheus + Grafana

## Goals / Non-Goals

**Goals:**

1. **前端埋点 SDK**（`@luhanxin/tracker`）— 性能 + 错误 + 行为 + 安全 + rrweb 预留接口
2. **后端采集服务**（`services/svc-analytics`）— HTTP 端点 + ClickHouse 写入 + 告警
3. **ClickHouse 数据模型** — 事件表 + 会话表 + 安全事件表
4. **安全监控** — CSP 违规 + 认证异常 + API 滥用 + 内容安全信号
5. **基础设施监控** — Prometheus + Grafana Dashboard
6. **统一告警** — 错误率/性能异常/安全事件/基础设施告警
7. **rrweb 预留接口** — Observer 模式，未来可选模块

**Non-Goals:**

- A/B 测试、rrweb 实现部分、日志聚合、WAF

## Decisions

### Decision 1: 统一监控架构设计

**三层监控体系**：

| 层级 | 范围 | 技术栈 | 数据源 |
|------|------|--------|--------|
| **前端监控** | 用户行为、性能、错误、安全 | @luhanxin/tracker SDK | 浏览器 API |
| **后端监控** | API 性能、错误、业务事件 | svc-analytics + Prometheus | Gateway/微服务 |
| **基础设施监控** | 主机、容器、中间件 | Prometheus + Exporters | 系统指标 |

**统一数据流**：

```
前端 SDK → Gateway → svc-analytics → ClickHouse
                                      ↓
                              Grafana Dashboard
                                      ↓
                              AlertManager
```

### Decision 2: 埋点 SDK 设计（含安全监控）

```typescript
// packages/tracker/src/index.ts
import { Tracker } from '@luhanxin/tracker';

const tracker = new Tracker({
  endpoint: '/api/v1/analytics/collect',
  appId: 'main',
  sampleRate: 1.0,
  batchSize: 10,
  flushInterval: 5000,
  maxQueueSize: 50,
  
  // 安全监控配置
  security: {
    cspReportUri: '/api/v1/analytics/security/csp',
    enableSuspiciousInputDetection: true,
  },
  
  // rrweb 预留配置（初期不实现）
  sessionReplay: {
    enabled: false, // 未来开启
    sampleRate: 0.1, // 10% 用户录制
  },
});

// 自动采集
tracker.init();

// 手动埋点
tracker.track('button_click', { button_name: 'publish', page: '/article/new' });
tracker.trackTime('article_edit_duration', 120000);

// 安全事件上报（自动，也可手动）
tracker.trackSecurity('suspicious_input', { field: 'comment', value: '...' });
```

**自动采集的事件类型**：

| 事件类型 | 数据 | 说明 |
|----------|------|------|
| **性能** | FCP/LCP/CLS/INP/TTFB | Core Web Vitals |
| **错误** | message/stack/url | JS 异常 + Unhandled Rejections |
| **行为** | URL/referrer/title/duration | 页面浏览 + 路由跳转 |
| **安全** | type/payload/url | CSP 违规 + 可疑输入 + 异常行为 |

### Decision 3: 安全监控设计

#### 3.1 CSP 违规上报

**Gateway CSP 配置**：

```rust
// services/gateway/src/middleware/csp.rs
pub fn csp_middleware() -> impl Transform {
    // 使用 Report-Only 模式，不阻塞，仅上报
    let csp_header = format!(
        "default-src 'self'; \
         script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; \
         style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
         report-uri /api/v1/analytics/security/csp"
    );
    
    move |req: Request, next: Next| async move {
        let mut response = next.run(req).await;
        response.headers_mut().insert(
            "Content-Security-Policy-Report-Only",
            csp_header.parse()?
        );
        Ok(response)
    }
}
```

**CSP 违规事件上报**：

```typescript
// 前端自动捕获 CSP violation
document.addEventListener('securitypolicyviolation', (e) => {
  tracker.trackSecurity('csp_violation', {
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
    sourceFile: e.sourceFile,
    lineNumber: e.lineNumber,
  });
});
```

#### 3.2 认证异常检测

**后端监控认证失败率**：

```rust
// services/gateway/src/handlers/auth.rs
pub async fn login() -> Result<JwtToken, AuthError> {
    match verify_credentials(&req).await {
        Ok(token) => Ok(token),
        Err(e) => {
            // 上报认证失败事件
            analytics.track_security("auth_failure", json!({
                "username": req.username,
                "ip": req.ip(),
                "reason": e.to_string(),
            }));
            Err(e)
        }
    }
}
```

**告警规则**：
- 同一 IP 1 分钟内认证失败 > 5 次 → 暴力破解告警
- 同一用户 1 小时内异地登录 > 2 次 → 账户异常告警

#### 3.3 API 滥用检测

**请求频率监控**：

```rust
// services/gateway/src/middleware/rate_limit.rs
pub async fn rate_limit_middleware(req: Request, next: Next) -> Result<Response> {
    let ip = req.ip();
    let key = format!("luhanxin:rate_limit:{}", ip);
    
    let count = redis.incr(&key).await?;
    if count == 1 {
        redis.expire(&key, 60).await?; // 1 分钟窗口
    }
    
    if count > 100 {
        // 上报 API 滥用
        analytics.track_security("api_abuse", json!({
            "ip": ip,
            "path": req.path(),
            "count": count,
        }));
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    
    next.run(req).await
}
```

#### 3.4 内容安全信号

**敏感词触发统计**：

```rust
// services/svc-content/src/handlers/article.rs
pub async fn create_article() -> Result<Article> {
    // 检测敏感词
    let sensitive_words = detect_sensitive_words(&req.content)?;
    if !sensitive_words.is_empty() {
        analytics.track_security("sensitive_content", json!({
            "user_id": req.user_id,
            "words": sensitive_words,
            "content_type": "article",
        }));
    }
    
    // 继续创建文章
    Ok(create_article_internal(req).await?)
}
```

### Decision 4: rrweb 预留接口设计

**Observer 模式** — SDK 预留录制接口，但初期不实现：

```typescript
// packages/tracker/src/session-replay/types.ts
export interface SessionReplayObserver {
  /** 开始录制 */
  start(): void;
  /** 停止录制 */
  stop(): void;
  /** 获取录制数据 */
  getEvents(): rrweb.EventType[];
  /** 上传录制数据 */
  upload(): Promise<void>;
}

// packages/tracker/src/session-replay/index.ts
export class SessionReplay implements SessionReplayObserver {
  private enabled: boolean;
  private events: rrweb.EventType[] = [];
  private recorder: rrweb.record | null = null;
  
  constructor(config: SessionReplayConfig) {
    this.enabled = config.enabled;
    
    // 仅在启用时动态加载 rrweb（减小包体积）
    if (this.enabled) {
      import('rrweb').then(({ record }) => {
        this.recorder = record({
          emit: (event) => this.events.push(event),
        });
      });
    }
  }
  
  start() {
    if (!this.enabled || !this.recorder) return;
    // 已在构造函数中开始录制
  }
  
  stop() {
    this.recorder?.stop();
  }
  
  getEvents() {
    return this.events;
  }
  
  async upload() {
    const blob = new Blob([JSON.stringify(this.events)], { type: 'application/json' });
    await fetch('/api/v1/analytics/session-replay', {
      method: 'POST',
      body: blob,
    });
  }
}
```

**存储设计**（预留）：

- rrweb 录制文件存储到 S3/MinIO（1 分钟 ≈ 1-5MB）
- 元数据存储到 ClickHouse（session_id、user_id、时长、大小）
- 初期不实现，仅预留接口

### Decision 5: ClickHouse 表设计

```sql
-- 事件表
CREATE TABLE analytics.events (
  event_id UUID,
  event_type String,      -- page_view | click | error | performance | custom
  event_name String,
  app_id String,          -- main | feed | article | search | admin
  session_id UUID,
  user_id Nullable(String),
  properties String,      -- JSON
  timestamp DateTime64(3),
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (app_id, event_type, timestamp)
TTL timestamp + INTERVAL 90 DAY;

-- 安全事件表
CREATE TABLE analytics.security_events (
  event_id UUID,
  event_type String,      -- csp_violation | auth_failure | api_abuse | sensitive_content
  severity String,        -- low | medium | high | critical
  user_id Nullable(String),
  ip String,
  user_agent String,
  payload String,         -- JSON
  url String,
  timestamp DateTime64(3),
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, severity, timestamp)
TTL timestamp + INTERVAL 180 DAY; -- 安全事件保留更久

-- 会话表
CREATE TABLE analytics.sessions (
  session_id UUID,
  user_id Nullable(String),
  app_id String,
  start_time DateTime64(3),
  end_time DateTime64(3),
  page_count UInt32,
  duration UInt32,
  device String,
  browser String,
  os String,
  country String,
  city String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (app_id, user_id, start_time)
TTL start_time + INTERVAL 90 DAY;

-- [预留] 会话录制元数据表
CREATE TABLE analytics.session_recordings (
  recording_id UUID,
  session_id UUID,
  user_id Nullable(String),
  start_time DateTime64(3),
  end_time DateTime64(3),
  duration UInt32,
  file_size UInt64,
  file_path String,       -- S3/MinIO path
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (user_id, start_time)
TTL start_time + INTERVAL 30 DAY; -- 录制文件保留较短
```

### Decision 6: 基础设施监控（Prometheus）

**Prometheus 配置**：

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  # Gateway 指标
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:8000']
  
  # 微服务指标
  - job_name: 'svc-user'
    static_configs:
      - targets: ['svc-user:50051']
  
  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
  
  # ClickHouse Exporter
  - job_name: 'clickhouse'
    static_configs:
      - targets: ['clickhouse-exporter:9116']
  
  # Node Exporter (主机指标)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

**关键指标**：

| 类型 | 指标 | 告警阈值 |
|------|------|---------|
| **主机** | CPU 使用率 | > 80% |
| **主机** | 内存使用率 | > 85% |
| **主机** | 磁盘使用率 | > 90% |
| **服务** | QPS | 突增 2x |
| **服务** | Latency P95 | > 1s |
| **服务** | Error Rate | > 5% |
| **中间件** | PostgreSQL 连接数 | > 80% max |
| **中间件** | Redis 内存使用 | > 80% max |

### Decision 7: Grafana Dashboard 设计

**统一看板**：

| 看板 | 内容 | 数据源 |
|------|------|--------|
| **概览** | PV/UV、实时在线、错误率、QPS | ClickHouse + Prometheus |
| **性能** | Core Web Vitals、API Latency、Long Tasks | ClickHouse + Prometheus |
| **错误** | JS 错误数、错误率、TOP 错误、Stack Trace | ClickHouse |
| **安全** | CSP 违规、认证失败、API 滥用、敏感内容 | ClickHouse |
| **基础设施** | CPU/Memory/Disk、服务健康状态 | Prometheus |
| **业务** | 文章阅读量、评论互动率、搜索热词 | ClickHouse |

### Decision 8: 告警设计

**告警规则**：

```yaml
# alertmanager/rules.yml
groups:
  - name: frontend
    rules:
      - alert: HighErrorRate
        expr: rate(analytics_events{event_type="error"}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "前端错误率过高"
          description: "错误率 {{ $value }}% > 5%"
      
      - alert: PerformanceDegradation
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 性能下降"
  
  - name: security
    rules:
      - alert: HighCspViolations
        expr: rate(security_events{event_type="csp_violation"}[5m]) > 10
        for: 2m
        labels:
          severity: high
        annotations:
          summary: "CSP 违规频率异常"
      
      - alert: BruteForceDetected
        expr: rate(security_events{event_type="auth_failure"}[5m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "疑似暴力破解攻击"
  
  - name: infrastructure
    rules:
      - alert: HighCpuUsage
        expr: node_cpu_usage > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
```

**告警通知渠道**：

- 初期：邮件通知
- 后续：企业微信/钉钉 Webhook

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| ClickHouse 存储成本 | 事件量大时存储压力大 | TTL 90 天 + 采样率控制 + 冷热分离 |
| rrweb 存储成本 | 录制文件巨大（1min=1-5MB） | 初期不实现；未来仅 10% 用户录制 + 30 天 TTL |
| SDK 对前端性能影响 | 埋点代码增加 JS 体积 | Tree-shaking + 异步上报 + 批量合并 + rrweb 按需加载 |
| CSP 误报 | Report-Only 模式可能错过真实攻击 | 初期只上报不阻塞；收集数据后切换到 Enforce 模式 |
| 安全事件漏报 | 攻击者可能绕过前端检测 | 后端同时做检测；多层防御 |

## Open Questions（已解决）

1. **ClickHouse 是否需要冷热分离？**
   - ✅ 选择：**需要**
   - 理由：性能优化 + 成本控制
   - 实现：热数据（最近 7 天）SSD，冷数据（>7 天）HDD；使用 TTL 自动迁移

2. **CSP 策略何时从 Report-Only 切换到 Enforce？**
   - ✅ 选择：**观察 2 周无重大误报后切换**
   - 理由：安全与可用性平衡，避免误报影响正常用户

3. **rrweb 存储是否用 S3 还是 MinIO？**
   - ✅ 选择：**MinIO（自建对象存储）**
   - 理由：成本可控，运维简单，无需第三方依赖

4. **告警是否需要自动触发截图？**
   - ✅ 已在 `headless-browser-screenshot` Decision 7 中解决
   - 错误告警时自动截图页面现场

5. **是否需要 OpenTelemetry 链路追踪？**
   - ✅ 选择：**需要**
   - 理由：维护性高，问题定位快，与 Prometheus 指标互补
   - 实现：前端 → Gateway → 微服务全链路追踪
