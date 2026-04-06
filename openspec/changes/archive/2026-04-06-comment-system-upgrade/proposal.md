## Why

当前评论系统已实现基础功能（二级嵌套 + @提及），但用户体验和性能存在明显短板：

1. **无限滚动缺失** — 当前使用简单的一次性加载，长评论列表需要翻页，移动端体验差
2. **无排序能力** — 只能按时间排序，无法按热度/点赞数排序
3. **评论点赞体验差** — 点赞交互反馈慢，且缺少点赞动画
4. **Markdown 渲染不支持** — 评论内容纯文本展示，技术讨论中无法展示代码片段
5. **@提及无跳转** — @用户名没有链接到用户主页
6. **评论预览缺失** — 文章列表页无法看到评论数量/最新评论摘要
7. **评论加载性能** — 嵌套评论的数据获取策略不够高效

## What Changes

### 评论列表无限滚动

- 使用 `IntersectionObserver` 实现滚动加载更多评论
- 骨架屏 loading 状态
- 后端游标分页（cursor-based pagination）

### 评论排序

- 支持按「最新」和「最热」（点赞数）排序
- 后端新增排序参数

### 评论点赞增强

- 乐观更新（Optimistic Update）— 点击立即反馈，后台同步
- 点赞动画效果
- 点赞状态持久化

### 评论 Markdown 渲染

- 评论内容使用 `@luhanxin/md-parser` 渲染（依赖 `markdown-parser-package` change）
- 支持 GFM 基础语法（代码片段、链接、加粗等）
- 不支持 Mermaid/KaTeX 等重量级功能

### @提及跳转

- @用户名渲染为链接，跳转到用户主页

### 评论计数预览

- 文章列表页显示评论数量
- 文章详情页顶部显示评论摘要（最新 N 条评论预览）

## 非目标 (Non-goals)

- **不做评论结构变更** — 不引入三级或更深层嵌套
- **不做评论审核系统** — 内容审核不在本次范围
- **不做评论富媒体** — 不支持图片/视频上传
- **不做 Markdown 编辑器** — 评论输入仍使用简单 textarea + 快捷工具栏
- **不涉及后端架构变更** — 微服务结构不变

## 与现有设计文档的关系

- **`docs/design/2026-03-20/06-feature-modules.md`** — 评论系统属于核心功能模块
- **`openspec/changes/markdown-parser-package/`** — 评论 Markdown 渲染依赖此包

## Capabilities

### New Capabilities

- `comment-infinite-scroll`: 评论无限滚动 — IntersectionObserver + 骨架屏 + 游标分页
- `comment-sort`: 评论排序 — 最新/最热切换
- `comment-optimistic-like`: 评论乐观点赞 — 立即反馈 + 后台同步

### Modified Capabilities

- `comment-display`: 评论展示升级 — Markdown 渲染 + @提及跳转
- `article-list`: 文章列表增强 — 评论数量预览

## Impact

### 代码影响

| 范围 | 变更类型 |
|------|---------|
| 评论前端组件 | 重构（无限滚动 + Markdown + 点赞） |
| 评论 store | 修改（新增排序状态、游标分页） |
| 文章列表页 | 修改（评论数量预览） |
| Proto（comment.proto） | 修改（新增排序参数、游标分页） |
| svc-content | 修改（排序逻辑、游标分页） |

### API 影响

- `ListComments` RPC 新增 `sort` 排序参数和游标分页参数
- `GetArticle` Response 新增 `comment_count` 字段

### 依赖影响

- 依赖 `@luhanxin/md-parser` 包
