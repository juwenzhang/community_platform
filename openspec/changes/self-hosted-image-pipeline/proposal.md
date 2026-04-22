## Why

平台已在使用 Cloudinary 作为图片存储与 CDN 分发（见 `apps/main/src/components/AvatarUpload/index.tsx`），但当前直接使用 Cloudinary 原图 URL，未对图片做任何处理：

| 问题 | 影响 |
|------|------|
| 图片格式未优化 | 原始 JPEG/PNG 体积大，移动端流量浪费 30-50% |
| 无响应式尺寸 | 4K 屏和手机下载同一张图，带宽/解码资源浪费 |
| EXIF 未剥离 | 手机拍照的图片带 GPS 坐标、相机型号，隐私泄漏风险 |
| 无水印 | 内容被外部盗图后无法追溯平台 |
| 无客户端审核 | 用户上传明显违规内容无法在源头拦截 |
| 无 LQIP 占位 | 首屏白屏闪烁，感知性能差 |

明确的架构方向：**Cloudinary 仅作为存储 + CDN 分发**，不依赖其 URL 变换/审核/水印能力。所有图片处理**在前端自建管线中完成**，上传前处理好再传 Cloudinary。

## What Changes

### 新建 `@luhanxin/image-pipeline` 工具包

```
packages/image-pipeline/
├── src/
│   ├── index.ts
│   ├── encode/
│   │   ├── toWebP.ts            # Canvas + OffscreenCanvas 转 WebP
│   │   └── resize.ts            # 多尺寸生成（480/800/1200/1920）
│   ├── watermark/
│   │   ├── addTextWatermark.ts  # Canvas 文字水印
│   │   └── types.ts
│   ├── lqip/
│   │   └── generate.ts          # 生成 20×15 模糊占位
│   ├── moderation/
│   │   ├── nsfwCheck.ts         # NSFW.js 封装（dynamic import）
│   │   └── types.ts
│   ├── pipeline/
│   │   ├── ImagePipeline.ts     # 编排所有步骤
│   │   └── types.ts
│   └── worker/
│       └── pipeline-worker.ts    # 在 Web Worker 中执行耗时操作
└── package.json
```

### 升级统一的 Upload Handler

- 实现 `createImagePipelineUploadHandler(opts)` 适配 `next-gen-document-editor` 中定义的 `UploadHandler` 接口
- 生成 4 个尺寸（480w/800w/1200w/1920w）+ 水印 + LQIP
- 上传全部到 Cloudinary，返回 `UploadResult { url, srcset, lqip }`

### 升级现有上传消费方

- `apps/main/src/components/AvatarUpload/`：改用新 pipeline（头像只生成单尺寸 + 无水印 + 保留 EXIF 清理）
- `apps/main/src/components/ArticleEditor/`（编辑器 Image 块）：使用完整 pipeline
- 未来子应用/评论编辑器统一走 pipeline

### 渲染端适配

- 扩展 `@luhanxin/md-parser-core` 的 `rehype-lazy-images` 插件：当图片 URL 带约定参数（如 `?srcset=480,800,1200,1920`）时生成 `<img srcset sizes loading="lazy">`
- 或者在 Markdown 中使用扩展语法承载 srcset（待 design 决策）

## 非目标 (Non-goals)

- **不迁移存储后端** — 仍使用 Cloudinary，不自建 S3/MinIO
- **不做服务端 NSFW 审核** — L2 模型服务留给未来（`content-moderation-l2` change）
- **不做视频/音频处理** — 仅图片
- **不做 GIF 转 MP4** — 保留原 GIF
- **不改变后端 API** — 上传签名接口 `/api/v1/upload/sign` 不动

## 与现有设计文档的关系

| 相关 change / spec | 关系 |
|---|---|
| `next-gen-document-editor` | 本 change 提供编辑器 Image 块的完整 upload handler 实现（当前 editor change 用降级版 Cloudinary 直传）|
| `markdown-parser-polish` | srcset 渲染可能需要 md-parser 做适配 |
| `md-parser-core` spec | 可能扩展 `rehype-lazy-images` 以支持 srcset |

## Capabilities

### New Capabilities

- `image-pipeline-package`: `@luhanxin/image-pipeline` 工具包契约 — WebP 转码、多尺寸、水印、LQIP、NSFW 检测
- `client-image-moderation`: 客户端图片 L1 审核 — NSFW.js 集成 + 阈值策略
- `responsive-image-rendering`: 响应式图片渲染 — srcset + sizes + LQIP 占位

### Modified Capabilities

- `avatar-upload`: 头像上传升级 — 接入 pipeline（仅 EXIF 剥离 + 单尺寸 WebP）
- `article-editor-integration`: 文章编辑器图片升级 — 接入完整 pipeline

## Impact

### 代码影响

| 范围 | 变更 |
|------|------|
| `packages/image-pipeline/` | **新增** |
| `apps/main/src/components/AvatarUpload/` | **重构**，接入 pipeline |
| `apps/main/src/components/ArticleEditor/` 或 `DocEditor` 调用层 | **升级** upload handler |
| `packages/md-parser-core/src/plugins/rehype-lazy-images.ts` | **增强** srcset 支持 |

### 依赖影响

新增：
- `nsfwjs` + `@tensorflow/tfjs`（仅 dynamic import，不进主包）
- 无新增后端依赖

### 性能影响

- 上传耗时：1x → 3-4x（多尺寸 + 转码 + 审核），用 Web Worker + 进度条缓解
- 加载耗时：移动端 -40%，桌面 -20%（WebP + 合适尺寸）
- 首屏 LCP：因 LQIP 显著改善
