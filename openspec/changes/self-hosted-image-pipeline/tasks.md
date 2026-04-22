## 任务拆分（骨架 — 启动时细化）

### Phase 1: 包基础设施（~6h）
- [ ] T1.1 创建 `packages/image-pipeline/` 包结构 + package.json + tsup 配置
- [ ] T1.2 定义核心类型：`PipelineOptions` / `UploadResult` / `WatermarkOptions`
- [ ] T1.3 实现通用 Web Worker 封装（Worker Manager 可复用 md-parser-core 的模式）

### Phase 2: WebP 转码 + 多尺寸（~8h）
- [ ] T2.1 `encode/toWebP.ts`：OffscreenCanvas → WebP blob（质量 0.85）
- [ ] T2.2 `encode/resize.ts`：生成 480/800/1200/1920 四档
- [ ] T2.3 EXIF 剥离验证（Canvas 重绘天然剥离，写测试确保）
- [ ] T2.4 单测：各种格式（JPEG/PNG/GIF/WebP）转码正确

### Phase 3: LQIP + 水印（~8h）
- [ ] T3.1 `lqip/generate.ts`：20×15 JPEG q=0.4 base64
- [ ] T3.2 `watermark/addTextWatermark.ts`：Canvas 文字水印（右下角，半透明白字 + 黑描边）
- [ ] T3.3 水印内容：`@{username}@{platformName}`，platformName 从参数传入（默认 `luhanxin-community`）
- [ ] T3.4 水印开关支持：外部传入 `enabled: boolean`
- [ ] T3.5 单测 + 视觉回归截图

### Phase 4: NSFW 审核（~6h）
- [ ] T4.1 `moderation/nsfwCheck.ts`：dynamic import nsfwjs + tfjs
- [ ] T4.2 阈值策略：色情 > 0.85 阻止；性感 > 0.9 警告；hentai > 0.7 阻止
- [ ] T4.3 模型缓存（IndexedDB）避免每次重新下载
- [ ] T4.4 降级：浏览器不支持 WebGL 时仅做客户端基本校验（大小/类型），审核跳过

### Phase 5: Pipeline 编排（~6h）
- [ ] T5.1 `pipeline/ImagePipeline.ts`：按配置组合各步骤
- [ ] T5.2 `createImagePipelineUploadHandler(opts)`：适配 editor 的 `UploadHandler` 接口
- [ ] T5.3 进度回调（各步骤百分比）
- [ ] T5.4 错误处理（单步骤失败的降级策略）

### Phase 6: 消费方升级（~8h）
- [ ] T6.1 `AvatarUpload` 接入 pipeline（头像简化配置：无水印、单尺寸）
- [ ] T6.2 编辑器 Image 块接入完整 pipeline（与 next-gen-document-editor 协调）
- [ ] T6.3 md-parser-core `rehype-lazy-images` 扩展 srcset 支持
- [ ] T6.4 详情页图片渲染验收（带 srcset、LQIP、懒加载）

### Phase 7: 文档与归档（~3h）
- [ ] T7.1 包 README
- [ ] T7.2 tech 文档：自建图片管线方案
- [ ] T7.3 Archive

## 总计

约 45h / 6 个工作日。细化由启动时 `openspec-continue-change` 完成。
