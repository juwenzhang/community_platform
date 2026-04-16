## Tasks

> **Status: All 12 tasks complete** ✅ (2026-04-06)

### Phase 1: Proto 定义 + 代码生成（最高优先级）

#### Task 1: 扩展 comment.proto — MediaAttachment 类型 + Comment/CreateCommentRequest 新字段 ✅
- **估时**: 1h
- **依赖**: 无
- **描述**:
  1. 在 `proto/luhanxin/community/v1/comment.proto` 中新增 `MediaType` 枚举（UNSPECIFIED/GIF/STICKER/IMAGE）和 `MediaAttachment` 消息（media_type/url/preview_url/width/height/giphy_id/alt_text）
  2. `Comment` 消息新增 `repeated MediaAttachment media_attachments = 14`（reply_count 已占用 13）
  3. `CreateCommentRequest` 消息新增 `repeated MediaAttachment media_attachments = 5`
  4. 运行 `make proto` 生成 Rust + TypeScript 代码
- **验收**: `make proto` 成功，`buf lint` 通过，生成的 Rust 和 TypeScript 代码可编译

### Phase 2: 数据库迁移

#### Task 2: comments 表新增 media_attachments JSONB 列
- **估时**: 1h
- **依赖**: 无
- **描述**:
  1. 在 `services/migration/` 新增 migration，给 `comments` 表添加 `media_attachments JSONB NOT NULL DEFAULT '[]'` 列
  2. 更新 SeaORM Entity `comments.rs`，新增 `media_attachments: Json` 字段
- **验收**: `sea-orm-cli migrate up` 成功，Entity 可编译，现有评论数据不受影响

### Phase 3: 后端 — svc-content 支持媒体附件

#### Task 3: CreateComment handler 支持 media_attachments
- **估时**: 1.5h
- **依赖**: Task 1, Task 2
- **描述**:
  1. 修改 `svc-content/handlers/comment/mod.rs` 的 CreateComment handler
  2. 验证 media_attachments 数量限制（最多 1 个 GIF/Sticker）
  3. 验证 content 和 media_attachments 至少有一个非空
  4. 将 `repeated MediaAttachment` 序列化为 JSON 存入 `media_attachments` JSONB 列
  5. 验证 media_type 只允许 GIF/STICKER（IMAGE 预留，本次不启用）
- **验收**: grpcurl 测试创建带 media_attachments 的评论成功，校验逻辑正确

#### Task 4: ListComments handler 返回 media_attachments
- **估时**: 1h
- **依赖**: Task 2
- **描述**:
  1. 修改 `svc-content/handlers/comment/mod.rs` 的 ListComments handler
  2. 从 `media_attachments` JSONB 列反序列化为 Proto `MediaAttachment` 列表
  3. 填充到 Comment 响应中
- **验收**: grpcurl 测试 ListComments 正确返回 media_attachments 字段

### Phase 4: 前端 — GIPHY SDK 安装 + GiphyPicker 组件

#### Task 5: 安装 GIPHY SDK 依赖 + 配置环境变量
- **估时**: 0.5h
- **依赖**: 无
- **描述**:
  1. `cd apps/main && pnpm add @giphy/js-fetch-api @giphy/react-components`
  2. 在 `apps/main/.env.local`（gitignored）中配置 `VITE_GIPHY_API_KEY`
  3. 在 `apps/main/.env.example` 中添加 `VITE_GIPHY_API_KEY=your_giphy_api_key_here`
  4. 创建 `apps/main/src/lib/giphy.ts` — 导出 GiphyFetch 单例
- **验收**: `import { GiphyFetch } from '@giphy/js-fetch-api'` 编译通过，环境变量可读取

#### Task 6: ExpressionPicker 组件（Emoji + GIF + Sticker 三 Tab）
- **估时**: 3h
- **依赖**: Task 5
- **描述**:
  1. 创建 `apps/main/src/components/ExpressionPicker/` 目录化组件
  2. `index.tsx`：Tab 容器（Emoji | GIF | Sticker），Tab 切换状态
  3. `GiphyGrid.tsx`：封装 `@giphy/react-components` 的 Grid 组件 + SearchBar
     - 默认展示趋势（`gf.trending()`），搜索时切换到 `gf.search(query)`
     - 搜索 debounce 300ms
     - 点击 GIF/Sticker 触发 `onSelect(MediaAttachment)` 回调
     - 底部 "Powered by GIPHY" attribution
  4. `expressionPicker.module.less`：样式（面板宽 340px，高 360px，Tab 样式，Grid 容器滚动）
  5. 保留现有 `EmojiPicker` 作为 Emoji Tab 的内容（import 复用）
- **验收**: 三个 Tab 可切换，GIF/Sticker 搜索正常，选择回调触发

#### Task 7: MediaPreview 组件（选中媒体预览 + 删除）
- **估时**: 1h
- **依赖**: Task 1（需要 MediaAttachment TypeScript 类型）
- **描述**:
  1. 创建 `apps/main/src/components/ExpressionPicker/MediaPreview.tsx`
  2. 展示选中的 GIF/Sticker 缩略图（preview_url，max-height 80px）
  3. 右上角删除按钮（CloseOutlined）
  4. GIF 和 Sticker 区分样式（Sticker 透明背景）
- **验收**: 选中 GIF 后预览正确展示，点击删除可移除

### Phase 5: 前端 — CommentSection 集成

#### Task 8: CommentSection 输入区重构 — 集成 ExpressionPicker + MediaPreview
- **估时**: 2.5h
- **依赖**: Task 6, Task 7
- **描述**:
  1. 修改 `apps/main/src/components/CommentSection/index.tsx`
  2. 替换现有的 EmojiPicker Popover 为 ExpressionPicker（三个按钮：表情/GIF/Sticker）
  3. 新增 `selectedMedia` state（`MediaAttachment | null`）
  4. 在 textarea 下方添加 MediaPreview 组件
  5. 修改 `handleMainSubmit` 和 `handleInlineSubmit`：提交时携带 `mediaAttachments`
  6. 修改 `useCommentStore.createComment`：支持传递 `mediaAttachments` 参数
  7. 提交成功后清除 `selectedMedia`
  8. 更新 `commentSection.module.less`：工具栏按钮组、预览区样式
- **验收**: 评论输入区显示三个工具按钮，选择 GIF 后预览展示，提交后携带 media_attachments

#### Task 9: 评论列表富媒体渲染 — MediaAttachmentRenderer 组件
- **估时**: 1.5h
- **依赖**: Task 1（TypeScript 类型）
- **描述**:
  1. 创建 `apps/main/src/components/CommentSection/MediaAttachmentRenderer.tsx`
  2. 根据 media_type 渲染不同样式：
     - GIF：`<img>` 标签，max-height 200px，圆角，点击事件（TODO: 后续可加 lightbox）
     - Sticker：`<img>` 标签，max-height 150px，无背景
  3. "via GIPHY" 小标记（右下角，半透明）
  4. 修改 CommentSection 的 `renderComment` 方法，在 `.commentContent` 后渲染 MediaAttachmentRenderer
- **验收**: 带 GIF 的评论正确展示动图，带 Sticker 的评论展示透明背景贴纸

### Phase 6: useCommentStore 扩展

#### Task 10: useCommentStore 支持 media_attachments
- **估时**: 1h
- **依赖**: Task 1（TypeScript 类型）
- **描述**:
  1. 修改 `apps/main/src/stores/useCommentStore.ts`
  2. `createComment` 方法签名新增 `mediaAttachments?: MediaAttachment[]` 参数
  3. 调用 `commentClient.createComment` 时传入 `mediaAttachments`
  4. 验证 Proto 生成的 TypeScript 类型正确传递
- **验收**: Store 方法正确传递 media_attachments 到后端

### Phase 7: 样式优化 + 暗黑模式适配

#### Task 11: ExpressionPicker + MediaRenderer 样式完善
- **估时**: 1.5h
- **依赖**: Task 6, Task 9
- **描述**:
  1. 完善 ExpressionPicker 面板样式（响应式宽度、Tab 切换动画、搜索框样式）
  2. 完善评论中 GIF/Sticker 的展示样式（圆角、阴影、hover 效果）
  3. 确保 CSS 变量兼容暗黑模式（`var(--color-bg-card)`、`var(--color-border)` 等）
  4. 移动端适配（小屏幕面板全宽）
- **验收**: 亮色/暗色模式下组件样式正确，移动端布局合理

### Phase 8: 环境配置 + 文档

#### Task 12: 环境配置 + GIPHY API Key 文档
- **估时**: 0.5h
- **依赖**: Task 5
- **描述**:
  1. 更新 `docker/.env.example`：添加 `VITE_GIPHY_API_KEY` 说明
  2. 更新 `README.md` 或 `docs/` 说明 GIPHY API Key 配置方法
  3. 确认 `.env.local` 在 `.gitignore` 中
- **验收**: 新开发者按文档配置后 GIPHY 功能可用

---

## 任务依赖关系图

```
Task 1 (Proto) ──┬──→ Task 3 (CreateComment)
                 │                  ↓
Task 2 (DB) ─────┤──→ Task 4 (ListComments)
                 │
                 ├──→ Task 7 (MediaPreview)
                 │
                 ├──→ Task 9 (MediaRenderer)
                 │
                 └──→ Task 10 (Store 扩展)

Task 5 (GIPHY SDK) ──→ Task 6 (ExpressionPicker) ──→ Task 8 (CommentSection 集成)
                                                           ↓
Task 12 (环境配置)                                    Task 11 (样式优化)
```

**建议执行顺序**：
1. **并行启动**：Task 1 (Proto) + Task 2 (DB) + Task 5 (GIPHY SDK)
2. **后端**：Task 3 → Task 4
3. **前端组件**：Task 6 → Task 7 → Task 8 → Task 9
4. **Store**：Task 10（可与 Task 8 并行）
5. **收尾**：Task 11 → Task 12

**预估总工时**：~16h
