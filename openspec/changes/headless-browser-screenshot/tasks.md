## 1. Proto 定义

- [ ] 1.1 创建 `proto/luhanxin/community/v1/screenshot.proto` — ScreenshotService + GenerateOgImage + ExportPdf + CaptureSnapshot RPC
- [ ] 1.2 执行 `make proto`

> **依赖**：无前置依赖。

## 2. 服务骨架

- [ ] 2.1 创建 `services/svc-screenshot/` 微服务骨架 — Cargo.toml + main.rs + config.rs
- [ ] 2.2 添加 Playwright Rust 依赖
- [ ] 2.3 实现 Playwright 浏览器池 — 启动时初始化 N 个浏览器实例
- [ ] 2.4 实现请求队列 — 限制并发截图数量
- [ ] 2.5 实现健康检查 — 浏览器存活检测

> **依赖**：无前置依赖。可与 Phase 1 并行。

## 3. OG 图片生成

- [ ] 3.1 实现 GenerateOgImage gRPC handler — 获取文章数据 → 渲染 HTML 模板 → 截图
- [ ] 3.2 设计 OG 图片 HTML 模板 — 标题/作者/日期/平台 Logo
- [ ] 3.3 实现模板渲染 — 动态替换文章数据到 HTML
- [ ] 3.4 实现多尺寸支持 — 1200x630（Facebook）+ 1920x1080（Twitter）
- [ ] 3.5 实现缓存 — Redis 缓存已生成的图片
- [ ] 3.6 在文章发布流程中集成 — 发布时自动调用生成 OG 图片

> **依赖**：依赖 Phase 1 + Phase 2。

## 4. PDF 导出

- [ ] 4.1 实现 ExportPdf gRPC handler — 获取文章 HTML → Playwright 打印为 PDF
- [ ] 4.2 实现 HTML 渲染 — 使用文章渲染 URL 或直接渲染 Markdown→HTML
- [ ] 4.3 实现水印（可选） — PDF 底部添加平台水印
- [ ] 4.4 实现存储 — PDF 保存到对象存储或返回 base64
- [ ] 4.5 前端 PDF 导出按钮 — 文章详情页「导出 PDF」按钮

> **依赖**：依赖 Phase 1 + Phase 2。

## 5. 页面快照

- [ ] 5.1 实现 CaptureSnapshot gRPC handler — 给定 URL 截取页面截图
- [ ] 5.2 实现全页截图 — 自动滚动截取完整页面
- [ ] 5.3 实现快照存储 — 保存到对象存储
- [ ] 5.4 实现快照列表 — 查看文章的历史快照

> **依赖**：依赖 Phase 2。

## 6. Gateway 集成

- [ ] 6.1 在 Gateway 中注册 ScreenshotService 路由
- [ ] 6.2 实现 REST API 包装 — `/api/v1/screenshots/og/:article_id` 等
- [ ] 6.3 添加请求转发 — Gateway → svc-screenshot

> **依赖**：依赖 Phase 3 + Phase 4。

## 7. Docker 配置

- [ ] 7.1 修改 `docker/docker-compose.yml` — 新增 svc-screenshot 容器
- [ ] 7.2 配置 Playwright 浏览器镜像
- [ ] 7.3 配置资源限制（内存/CPU）

> **依赖**：依赖 Phase 2。

## 8. 验证

- [ ] 8.1 OG 图片生成测试 — 验证图片尺寸、内容、质量
- [ ] 8.2 PDF 导出测试 — 验证格式、内容完整性
- [ ] 8.3 性能测试 — 并发截图不超时
- [ ] 8.4 缓存测试 — 重复请求命中缓存
