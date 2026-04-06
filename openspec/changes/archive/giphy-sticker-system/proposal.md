## Why

当前评论系统的表情输入体验非常基础：自研 EmojiPicker 只包含约 67 个 Unicode emoji（3 个分类），不支持 GIF 动图、GIPHY Sticker、趋势表情搜索。现代社交平台（Discord、Slack、掘金评论区）都已支持 GIF/Sticker 嵌入，这是社区活跃度的重要驱动力。

此外，当前评论 `content` 字段是纯文本 `string`，无法结构化地表示富媒体内容（图片、GIF、Sticker）。如果直接在文本中嵌入 URL，渲染逻辑和安全校验会变得混乱。需要在 Proto 层引入结构化的媒体附件模型。

**GIPHY SDK 选型理由**：
- `@giphy/js-fetch-api`：轻量的 GIPHY API 客户端（搜索/趋势/随机 GIF/Sticker）
- `@giphy/react-components`：开箱即用的 React 组件（Grid、Carousel、SearchBar），自带懒加载和响应式布局
- GIPHY 免费 API 额度充足（开发者 Key 限额宽裕），无需自建 GIF 存储

## 非目标 (Non-goals)

- **自定义表情包上传**：不做用户自创表情包功能（需要审核系统），只使用 GIPHY 官方库
- **文章正文 GIF 嵌入**：本次只支持评论中嵌入 GIF/Sticker，文章编辑器 GIF 留后续
- **Emoji Reaction 系统**：不做类似 GitHub 的多种 emoji reaction（👍😄❤️ 等 reaction 按钮），保持现有 like/unlike 二元模式
- **GIF 代理缓存**：不做 GIPHY CDN 图片的本地缓存/代理，直接使用 GIPHY CDN URL
- **Sticker 收藏夹**：不做用户收藏常用 Sticker 的功能

## 与现有设计文档的关系

- 基于已归档的 `social-interaction-and-ux-polish` 变更中的评论系统实现（`comment.proto`、`CommentSection` 组件、`EmojiPicker` 组件）
- 评论 Proto `Comment` 消息需要新增 `media_attachments` 字段扩展
- 前端 `CommentSection` 需要重构输入区域，集成 GIPHY Picker
- 不影响 `community-interaction-enhancement`（通知/搜索/缓存）和 `user-experience-optimization`（暗黑模式/图片上传）两个进行中的 Change

## What Changes

### 🎭 GIPHY GIF/Sticker 选择器
- 前端新增 `GiphyPicker` 组件（基于 `@giphy/react-components` 的 Grid + SearchBar）
- 支持 3 种模式：GIF 搜索、Sticker 搜索、趋势推荐
- 替换/增强现有 EmojiPicker，保留 Unicode emoji 选择功能
- GIPHY API Key 通过环境变量 `VITE_GIPHY_API_KEY` 注入前端（GIPHY API Key 是公开的 client-side key，可安全暴露给前端）

### 📦 评论 Proto 扩展 — 富媒体附件
- `Comment` 消息新增 `repeated MediaAttachment media_attachments` 字段
- `MediaAttachment` 消息定义媒体类型（GIF/STICKER/IMAGE）、URL、宽高、预览 URL 等
- `CreateCommentRequest` 同步新增 `media_attachments` 字段
- 后端 svc-content 存储附件元数据（JSON 序列化到 `media_attachments` JSONB 列）

### 🖼️ 评论富媒体渲染
- 评论列表渲染时，`media_attachments` 中的 GIF/Sticker 以内联方式展示
- GIF：自动播放、点击放大
- Sticker：透明背景覆盖展示
- 评论内容区域：文本 + 媒体混合排列

### 🔄 EmojiPicker 升级
- 将现有 67 个 Unicode emoji 的 EmojiPicker 保留为 Emoji Tab
- 新增 GIF Tab 和 Sticker Tab（使用 GIPHY SDK 组件）
- Tab 切换：😀 Emoji | 🎬 GIF | ✨ Sticker

## Capabilities

### New Capabilities
- `giphy-picker`: GIPHY GIF/Sticker 选择器组件，包含搜索、趋势推荐、Tab 切换
- `comment-rich-media`: 评论富媒体附件系统，包含 Proto 扩展、后端存储、前端渲染

### Modified Capabilities
- `comment-system`（归档 spec）: Comment 消息新增 media_attachments 字段，CreateComment 支持携带媒体附件
- `header-user-menu`（如果需要主题色适配 GIPHY 组件的暗黑模式）

## Impact

### Proto 变更
- 修改 `comment.proto`：Comment 新增 `repeated MediaAttachment media_attachments` 字段（字段号 14，因 reply_count 已占用 13）
- 修改 `comment.proto`：CreateCommentRequest 新增 `repeated MediaAttachment media_attachments` 字段（字段号 5）
- 新增 `MediaAttachment` 消息、`MediaType` 枚举（定义在 `common.proto` 或 `comment.proto` 中）

### 数据库变更
- 修改 `comments` 表：新增 `media_attachments JSONB DEFAULT '[]'` 列
- SeaORM migration + Entity 更新

### 后端变更
- svc-content `handlers/comment/mod.rs`：CreateComment handler 支持保存 media_attachments
- svc-content `handlers/comment/mod.rs`：ListComments 返回 media_attachments
- 无需新增微服务或 Gateway 端点（GIPHY API 在前端直接调用，不经过后端）

### 前端变更
- **新增依赖**：`@giphy/js-fetch-api`、`@giphy/react-components`
- **新增组件**：`GiphyPicker`（GIF/Sticker 选择面板）
- **重构组件**：`CommentSection` 输入区（集成 GiphyPicker + 媒体预览）
- **新增组件**：`MediaAttachmentRenderer`（评论中渲染 GIF/Sticker/Image）
- **修改组件**：`EmojiPicker` 升级为 `ExpressionPicker`（Emoji + GIF + Sticker 三 Tab）
- **环境变量**：`VITE_GIPHY_API_KEY`
