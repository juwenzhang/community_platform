## Why

平台缺少服务端页面渲染能力，无法生成：

1. **OG 图片** — 社交分享时无法显示文章封面图（标题 + 作者 + 摘要 + 预览图）
2. **PDF 导出** — 用户无法将文章导出为 PDF 格式
3. **页面快照/归档** — 无法保存文章页面的视觉快照（防止删除后丢失）
4. **邮件通知预览** — 通知邮件中无法嵌入文章预览图片
5. **SEO 优化** — 服务端渲染可改善搜索引擎抓取效果

需要一个基于 Playwright 的无头浏览器截图服务（`services/svc-screenshot`），为平台提供「页面 → 图片/PDF」的能力。

## What Changes

### 无头浏览器截图服务（`services/svc-screenshot`）

- 基于 Playwright 的无头浏览器服务
- URL 截图 API：给定文章 URL，返回渲染后的图片
- PDF 导出 API：给定文章 URL，返回 PDF 文件
- 自定义模板：OG 图片模板、邮件预览模板
- 缓存策略：相同 URL 的截图结果缓存到 Redis/对象存储

### OG 图片生成

- 文章发布时自动生成 OG 图片
- 模板包含：文章标题、作者头像+姓名、发布日期、平台 Logo
- 尺寸：1200x630（Facebook/微信标准）、1920x1080（Twitter）
- 缓存到对象存储（或 PostgreSQL BYTEA）

### PDF 导出

- 用户手动触发导出
- 文章 HTML → PDF（含代码高亮、图片）
- 水印（可选）

### 页面归档

- 文章快照功能：定时/手动保存页面视觉快照
- 用于「时光机」功能（查看文章历史版本的外观）

## 非目标 (Non-goals)

- **不做完整 SSR** — 不做全站服务端渲染（只做截图/PDF 的按需渲染）
- **不做视频录制** — 页面视频录制不在范围
- **不做自动化测试** — Playwright 用于截图，不用于 E2E 测试

## 与现有设计文档的关系

- **`docs/design/2026-03-20/05-infrastructure.md`** — 新增 svc-screenshot 微服务

## Capabilities

### New Capabilities

- `screenshot-service`: 无头浏览器截图 — Playwright 服务 + API
- `og-image-generation`: OG 图片自动生成 — 文章发布时生成社交分享图片
- `pdf-export`: PDF 导出 — 文章 HTML → PDF

## Impact

### 新增

- `services/svc-screenshot/` — 无头浏览器截图服务

### 修改

- `services/gateway/` — 新增截图/PDF API 路由
- `proto/` — 新增 ScreenshotService RPC 定义
- `docker/docker-compose.yml` — Playwright 浏览器容器

### 依赖

新增 Rust 依赖：`playwright`（Rust binding）
