## Context

平台需要服务端页面渲染能力，用于 OG 图片生成、PDF 导出和页面归档。Rust 生态中 Playwright 有官方绑定。

## Goals / Non-Goals

**Goals:**

1. Playwright 无头浏览器截图服务
2. OG 图片自动生成（文章发布时触发）
3. PDF 导出（用户手动触发）
4. 截图缓存策略

**Non-Goals:**

- 全站 SSR、视频录制、自动化测试

## Decisions

### Decision 1: 服务架构

```
Gateway → svc-screenshot (Playwright) → 截图 → Redis 缓存/对象存储
```

`svc-screenshot` 作为独立微服务，通过 gRPC 对外提供截图 API。

### Decision 2: API 设计

```protobuf
// proto/luhanxin/community/v1/screenshot.proto
service ScreenshotService {
  rpc GenerateOgImage(GenerateOgImageRequest) returns (GenerateOgImageResponse);
  rpc ExportPdf(ExportPdfRequest) returns (ExportPdfResponse);
  rpc CaptureSnapshot(CaptureSnapshotRequest) returns (CaptureSnapshotResponse);
}

message GenerateOgImageRequest {
  string article_id = 1;
  OgImageSize size = 2;  // FACEBOOK_1200x630 | TWITTER_1920x1080
}

message ExportPdfRequest {
  string article_id = 1;
  bool include_watermark = 2;
}
```

### Decision 3: OG 图片模板

使用 HTML 模板 + Playwright 截图：

```html
<!-- OG 图片模板 -->
<div style="width:1200px; height:630px; background: linear-gradient(135deg, #667eea, #764ba2);">
  <div style="padding: 60px;">
    <h1 style="font-size: 48px; color: white;">文章标题</h1>
    <div style="margin-top: 20px; display: flex; align-items: center;">
      <img src="avatar_url" style="width: 40px; border-radius: 50%;" />
      <span style="color: rgba(255,255,255,0.8); margin-left: 12px;">作者名 · 2026-04-05</span>
    </div>
  </div>
</div>
```

### Decision 4: 缓存策略

| 场景 | 缓存位置 | TTL |
|------|---------|-----|
| OG 图片 | Redis (base64) + 对象存储 | 永久（文章不删则不失效） |
| PDF | 对象存储 | 永久 |
| 页面快照 | 对象存储 | 永久 |

### Decision 5: 浏览器池容量规划

**问题**：无头浏览器占用大量内存，需要池化管理。

**资源配置**：

| 资源 | 单实例配置 | 10 并发配置 |
|------|-----------|-----------|
| **内存** | 512MB | 5GB |
| **CPU** | 0.5 核 | 5 核 |
| **启动时间** | 2s | - |

**池化策略**：

```rust
// services/svc-screenshot/src/browser_pool.rs
use deadpool::managed::Pool;

pub struct BrowserPool {
    pool: Pool<BrowserManager>,
}

impl BrowserPool {
    pub fn new(max_size: usize) -> Self {
        let config = PoolConfig::new(max_size);
        let pool = Pool::from_config(Manager::new(), config);
        Self { pool }
    }
    
    pub async fn capture(&self, url: &str) -> Result<Vec<u8>> {
        let browser = self.pool.get().await?;
        let page = browser.new_page().await?;
        page.goto(url).await?;
        page.screenshot().await
    }
}
```

**容量规划公式**：

```
最大并发 = 服务器内存 / 单浏览器内存
推荐值 = 最大并发 * 0.7 (预留缓冲)
```

**示例**：16GB 内存服务器 → 最大并发 32 → 推荐池大小 22

### Decision 6: 安全沙箱隔离

**问题**：无头浏览器可能被恶意页面攻击。

**隔离措施**：

| 层级 | 隔离措施 |
|------|---------|
| **容器级** | Playwright 运行在独立 Docker 容器中 |
| **网络级** | 容器仅允许访问白名单域名 |
| **资源级** | 限制 CPU/内存使用量（cgroups） |
| **进程级** | 每个 Playwright 实例独立进程 |

**Docker 安全配置**：

```dockerfile
# docker/playwright/Dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0

# 非 root 用户运行
RUN useradd -m playwright
USER playwright

# 只读文件系统
# --read-only --tmpfs /tmp

# 限制网络访问（启动时指定）
# --network=none 或自定义网络
```

**白名单域名**：

```rust
// services/svc-screenshot/src/whitelist.rs
const ALLOWED_DOMAINS: &[&str] = &[
    "luhanxin.com",
    "cdn.luhanxin.com",
    "assets.luhanxin.com",
];

pub fn is_allowed_url(url: &str) -> bool {
    let parsed = url::Url::parse(url)?;
    ALLOWED_DOMAINS.contains(&parsed.host_str()?)
}
```

### Decision 7: 告警联动自动截图

**问题**：错误告警发生时，需要看到页面现场。

**联动方案**：

```rust
// services/gateway/src/alerts/mod.rs
pub async fn trigger_alert_with_screenshot(
    alert_type: AlertType,
    context: AlertContext,
) -> Result<()> {
    // 1. 发送告警通知
    send_alert(&alert_type, &context).await?;
    
    // 2. 自动截图当前页面（如果有）
    if let Some(url) = context.page_url {
        let screenshot_client = ScreenshotClient::new();
        let image = screenshot_client.capture_snapshot(&url).await?;
        
        // 3. 上传到对象存储
        let path = upload_to_storage(&image).await?;
        
        // 4. 将截图链接附加到告警
        send_alert_with_image(&alert_type, &context, &path).await?;
    }
    
    Ok(())
}
```

**告警规则示例**：

| 告警类型 | 触发条件 | 自动截图 |
|----------|---------|---------|
| **前端错误** | JS 错误率 > 5% | 是 |
| **性能告警** | LCP > 3s | 是 |
| **安全告警** | CSP 违规 > 10/min | 是 |
| **基础设施告警** | CPU > 80% | 否 |

**Admin Dashboard 集成**：

```vue
<!-- apps/admin/src/views/Monitoring/ErrorDetail.vue -->
<template>
  <div>
    <h3>错误详情</h3>
    <pre>{{ error.stack }}</pre>
    
    <!-- 如果有截图，显示截图 -->
    <div v-if="error.screenshot_url" class="screenshot">
      <h4>错误发生时的页面截图</h4>
      <img :src="error.screenshot_url" />
    </div>
  </div>
</template>
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Playwright 资源消耗 | 无头浏览器占用大量内存 | 池化管理 + 请求队列 |
| 截图延迟 | 首次截图 2-5s | 预生成 + 缓存 |
| 浏览器安全 | 无头浏览器可能被攻击 | 容器隔离 + 网络限制 |

## Open Questions（已解决）

1. **Playwright 浏览器是否部署在独立容器中？**
   - ✅ 选择：**独立容器**
   - 理由：安全隔离，资源隔离，可维护性高
   - 实现：`docker/playwright/Dockerfile`，通过 Docker Compose 编排

2. **对象存储是否需要引入 MinIO/S3？**
   - ✅ 选择：**MinIO（自建对象存储）**
   - 理由：成本可控，运维简单，无需第三方依赖，性能足够
   - 配置：`docker-compose.yml` 中添加 MinIO 服务

3. **OG 图片是否需要支持用户自定义模板？**
   - ✅ 选择：**不支持初期，后续可扩展**
   - 理由：避免过早优化，初期使用平台统一模板，验证需求后再扩展
   - 预留接口：`/api/v1/screenshot/og?template=custom`（未来支持）
