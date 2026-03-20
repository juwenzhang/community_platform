# 基础设施设计 — Docker + 监控 + 埋点

> 📅 创建日期：2026-03-20
> 📌 状态：Draft — 待 Review

---

## 1. Docker 开发环境

### 1.1 docker-compose.dev.yml

```yaml
# docker/docker-compose.dev.yml
version: "3.9"

services:
  # ==========================================
  # PostgreSQL 数据库
  # ==========================================
  postgres:
    image: postgres:16-alpine
    container_name: luhanxin-postgres
    environment:
      POSTGRES_DB: luhanxin
      POSTGRES_USER: luhanxin
      POSTGRES_PASSWORD: luhanxin_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U luhanxin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==========================================
  # Redis 缓存
  # ==========================================
  redis:
    image: redis:7-alpine
    container_name: luhanxin-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==========================================
  # Meilisearch 全文搜索
  # ==========================================
  meilisearch:
    image: getmeili/meilisearch:v1.10
    container_name: luhanxin-meilisearch
    environment:
      MEILI_MASTER_KEY: luhanxin_meili_dev_key
      MEILI_ENV: development
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data

  # ==========================================
  # MinIO 对象存储
  # ==========================================
  minio:
    image: minio/minio:latest
    container_name: luhanxin-minio
    environment:
      MINIO_ROOT_USER: luhanxin_minio
      MINIO_ROOT_PASSWORD: luhanxin_minio_password
    ports:
      - "9000:9000"     # API
      - "9001:9001"     # Console
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  # ==========================================
  # ClickHouse (埋点数据分析)
  # ==========================================
  clickhouse:
    image: clickhouse/clickhouse-server:24-alpine
    container_name: luhanxin-clickhouse
    ports:
      - "8123:8123"     # HTTP
      - "9009:9000"     # Native (避免和 MinIO 冲突)
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  # ==========================================
  # Prometheus 监控
  # ==========================================
  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: luhanxin-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  # ==========================================
  # Grafana 数据可视化
  # ==========================================
  grafana:
    image: grafana/grafana:11.0.0
    container_name: luhanxin-grafana
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-clickhouse-datasource
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus

  # ==========================================
  # Sentry (错误追踪 - 自托管)
  # ==========================================
  # 注意：自托管 Sentry 资源消耗大，开发阶段建议使用 Sentry SaaS
  # 如需自托管，参考：https://github.com/getsentry/self-hosted

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
  minio_data:
  clickhouse_data:
  prometheus_data:
  grafana_data:
```

### 1.2 Prometheus 配置

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Rust 后端服务
  - job_name: 'luhanxin-gateway'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'

  - job_name: 'luhanxin-svc-user'
    static_configs:
      - targets: ['host.docker.internal:8001']
    metrics_path: '/metrics'

  - job_name: 'luhanxin-svc-content'
    static_configs:
      - targets: ['host.docker.internal:8002']
    metrics_path: '/metrics'

  - job_name: 'luhanxin-svc-social'
    static_configs:
      - targets: ['host.docker.internal:8003']
    metrics_path: '/metrics'

  - job_name: 'luhanxin-svc-notification'
    static_configs:
      - targets: ['host.docker.internal:8004']
    metrics_path: '/metrics'

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

---

## 2. 监控体系

### 2.1 四层监控模型

```
┌──────────────────────────────────────────────────────────┐
│ Layer 4: 业务指标                                         │
│ ├── DAU/MAU, 文章发布量, 评论量, 注册转化率                  │
│ └── 数据来源: ClickHouse (埋点数据)                        │
├──────────────────────────────────────────────────────────┤
│ Layer 3: 应用指标                                         │
│ ├── API 响应时间 (P50/P95/P99), 错误率, QPS              │
│ ├── 前端: FCP, LCP, FID, CLS (Core Web Vitals)          │
│ └── 数据来源: Prometheus (后端) + 埋点 SDK (前端)          │
├──────────────────────────────────────────────────────────┤
│ Layer 2: 中间件指标                                       │
│ ├── PostgreSQL: 连接数, 慢查询, 锁等待                     │
│ ├── Redis: 内存占用, 命中率, 连接数                         │
│ └── 数据来源: Exporters → Prometheus                      │
├──────────────────────────────────────────────────────────┤
│ Layer 1: 基础设施指标                                     │
│ ├── CPU, Memory, Disk I/O, Network                       │
│ └── 数据来源: Node Exporter → Prometheus                  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Rust 后端 Metrics 集成

```rust
// shared/src/metrics.rs

use axum::{extract::MatchedPath, middleware::Next, response::Response};
use metrics::{counter, histogram};
use std::time::Instant;

/// HTTP 请求指标中间件
pub async fn metrics_middleware(
    matched_path: Option<MatchedPath>,
    req: axum::extract::Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let method = req.method().to_string();
    let path = matched_path
        .map(|p| p.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let response = next.run(req).await;

    let duration = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    // 记录指标
    counter!("http_requests_total", "method" => method.clone(), "path" => path.clone(), "status" => status.clone()).increment(1);
    histogram!("http_request_duration_seconds", "method" => method, "path" => path).record(duration);

    if response.status().is_server_error() {
        counter!("http_errors_total", "status" => status).increment(1);
    }

    response
}
```

### 2.3 Grafana Dashboard 规划

| Dashboard | 内容 | 数据源 |
|-----------|------|--------|
| **API Overview** | 请求量、响应时间、错误率、Top 慢接口 | Prometheus |
| **Database** | PostgreSQL 连接数、查询耗时、慢查询 | Prometheus (postgres-exporter) |
| **Redis** | 内存用量、命中率、连接数、Key 数量 | Prometheus (redis-exporter) |
| **Business** | DAU、文章数、评论数、注册量 | ClickHouse |
| **Frontend** | Core Web Vitals、JS 错误、加载时间 | ClickHouse (埋点) |

---

## 3. 前端埋点 SDK 设计

### 3.1 SDK 架构

```
@luhanxin/sdk-tracker
├── core/
│   ├── Tracker           # 主类：初始化、配置
│   ├── Collector          # 数据采集器
│   ├── Reporter           # 数据上报器 (Beacon API / fetch)
│   └── Queue              # 上报队列 (批量上报 + 失败重试)
│
├── plugins/              # 插件化采集
│   ├── PageViewPlugin     # PV/UV 自动采集
│   ├── ClickPlugin        # 点击事件采集 (声明式埋点)
│   ├── ExposurePlugin     # 元素曝光采集 (IntersectionObserver)
│   ├── PerformancePlugin  # 性能指标采集 (PerformanceObserver)
│   ├── ErrorPlugin        # JS 错误采集 (onerror / unhandledrejection)
│   └── CustomPlugin       # 自定义事件采集
│
└── adapters/             # 框架适配器
    ├── react/             # React hooks (useTrack, useExposure)
    └── vue/               # Vue directives (v-track, v-exposure)
```

### 3.2 使用方式

```typescript
// 初始化 (主应用中)
import { createTracker } from '@luhanxin/sdk-tracker';

const tracker = createTracker({
  appId: 'luhanxin-web',
  endpoint: '/api/v1/track',  // 上报接口
  enableAutoPageView: true,
  enablePerformance: true,
  enableErrorCapture: true,
  batchSize: 10,              // 每批上报10条
  flushInterval: 5000,        // 5秒刷新
});

// 声明式埋点 (React)
import { useTrack } from '@luhanxin/sdk-tracker/react';

function ArticleCard({ article }) {
  const track = useTrack();

  return (
    <div
      data-track-exposure="article_card_show"
      data-track-params={JSON.stringify({ articleId: article.id })}
      onClick={() => track('article_click', { articleId: article.id })}
    >
      {/* ... */}
    </div>
  );
}

// 指令式埋点 (Vue)
// <div v-exposure="{ event: 'admin_panel_show', params: { tab: 'users' } }">
```

### 3.3 上报数据结构

```typescript
interface TrackEvent {
  event: string;           // 事件名称
  timestamp: number;       // 时间戳 (ms)
  sessionId: string;       // 会话 ID
  userId?: string;         // 用户 ID (登录后)
  deviceId: string;        // 设备指纹
  page: {
    url: string;
    path: string;
    referrer: string;
    title: string;
  };
  device: {
    ua: string;
    platform: string;      // pc, mobile, tablet
    screen: string;        // 分辨率
    language: string;
  };
  params: Record<string, unknown>;  // 自定义参数
}
```

### 3.4 ClickHouse 存储表

```sql
-- ClickHouse DDL
CREATE TABLE luhanxin.track_events (
    event          String,
    timestamp      DateTime64(3),
    session_id     String,
    user_id        Nullable(String),
    device_id      String,
    page_url       String,
    page_path      String,
    page_referrer  String,
    page_title     String,
    device_ua      String,
    device_platform String,
    device_screen  String,
    device_language String,
    params         String,    -- JSON string
    created_date   Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_date)
ORDER BY (event, timestamp, session_id)
TTL created_date + INTERVAL 90 DAY;

-- 物化视图：PV 统计
CREATE MATERIALIZED VIEW luhanxin.pv_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, page_path)
AS SELECT
    toDate(timestamp) AS date,
    page_path,
    count() AS pv,
    uniqExact(session_id) AS uv
FROM luhanxin.track_events
WHERE event = 'page_view'
GROUP BY date, page_path;
```

---

## 4. 错误追踪 (Sentry)

### 4.1 接入方案

| 端 | 方案 | 说明 |
|----|------|------|
| **前端 React** | `@sentry/react` | 自动捕获 JS 错误 + React ErrorBoundary |
| **前端 Vue** | `@sentry/vue` | 自动捕获 + Vue Error Handler |
| **后端 Rust** | `sentry-rust` crate | Panic 捕获 + tracing 集成 |

### 4.2 前端接入示例

```typescript
// apps/main/src/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,     // 10% 性能采样
  replaysSessionSampleRate: 0.01,  // 1% 会话回放
});
```

### 4.3 后端接入示例

```rust
// services/shared/src/sentry.rs
use sentry::integrations::tracing::EventFilter;

pub fn init_sentry(dsn: &str, environment: &str) -> sentry::ClientInitGuard {
    sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(environment.into()),
            traces_sample_rate: 0.1,
            ..Default::default()
        },
    ))
}
```

---

## 5. CI/CD 流水线

### 5.1 GitHub Actions 工作流

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  # ==========================================
  # 前端检查
  # ==========================================
  frontend-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm check              # Biome lint + format
      - run: pnpm spell               # cspell
      - run: pnpm -r run typecheck    # TypeScript 类型检查
      - run: pnpm -r run build        # 构建检查

  frontend-e2e:
    needs: frontend-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

  # ==========================================
  # 后端检查
  # ==========================================
  backend-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: luhanxin_test
          POSTGRES_USER: luhanxin
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    defaults:
      run:
        working-directory: ./services
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: Swatinem/rust-cache@v2
      - run: cargo fmt --all -- --check
      - run: cargo clippy --all-targets -- -D warnings
      - run: cargo test --all
```

---

## 6. 生产部署路线图

```
Phase 1 (开发阶段):
├── Docker Compose 一键启动所有依赖
├── 前端 pnpm dev 本地开发
└── 后端 cargo watch -x run 热重载

Phase 2 (测试/预发布):
├── Docker Compose 部署全栈到单机
├── Nginx 反向代理 + SSL
└── Sentry SaaS 版错误追踪

Phase 3 (生产环境):
├── Kubernetes 容器编排
├── PostgreSQL 主从 + 读写分离
├── Redis Cluster
├── CDN 加速静态资源
└── 自动伸缩 (HPA)
```

---

## 7. 开发环境启动流程

```bash
# 1. 克隆项目
git clone <repo-url> community_platform
cd community_platform

# 2. 启动基础设施
pnpm docker:up
# 等待所有服务 healthy

# 3. 安装前端依赖
pnpm install

# 4. 数据库迁移
cd services && cargo run -p migration -- up

# 5. 启动后端服务
cargo run -p gateway &
cargo run -p svc-user &
cargo run -p svc-content &
# ... 其他服务

# 6. 启动前端开发服务器
pnpm dev

# 7. 访问
# 前端: http://localhost:5173
# API:  http://localhost:8000/api/v1
# Grafana: http://localhost:3000
# Meilisearch: http://localhost:7700
# MinIO Console: http://localhost:9001
```
