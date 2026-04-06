## Context

平台已有完整的评论系统（二级嵌套 + @提及 + Unicode emoji），但表情交互能力有限：
- **现有 EmojiPicker**：67 个 Unicode emoji，3 个分类（常用/表情/手势），自研组件
- **评论内容模型**：纯 `string content`，无结构化媒体字段
- **无 GIF/Sticker 支持**：不支持动图搜索、发送、嵌入

**约束**：
- 前后端 API 走 Protobuf（Connect Protocol）
- GIPHY SDK 是客户端库，API Key 为公开 client-side key（不需要保密，只需限制 referrer）
- GIPHY CDN 图片直接使用，不走后端代理
- 评论 Proto 字段号已分配到 12（content=4, mentions=7, replies=12）

## Goals / Non-Goals

**Goals:**
- 评论支持发送 GIPHY GIF 和 Sticker
- 前端 ExpressionPicker 组件：Emoji + GIF + Sticker 三 Tab 切换
- GIF/Sticker 支持关键词搜索 + 趋势推荐
- 评论列表正确渲染嵌入的 GIF/Sticker
- Proto + 数据库 + 后端存储扩展，支持评论携带媒体附件

**Non-Goals:**
- 用户自创表情包上传
- 文章正文 GIF 嵌入
- Emoji Reaction 系统（多种表情反应）
- GIPHY CDN 图片代理/缓存
- Sticker 收藏夹

## Decisions

### Decision 1：GIPHY SDK 集成模式 — 前端直接调用 vs 后端代理

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. 前端直接调用 GIPHY API** | 零后端改动、延迟低、官方 React 组件可用 | API Key 暴露在前端（但 GIPHY Key 本身就是设计为公开的 client-side key） |
| B. 后端代理 GIPHY API | Key 完全隐藏 | 增加后端复杂度、每次搜索多一跳、需要实现 GIPHY 响应转换 |

**选择 A**：前端直接调用 GIPHY API。

**理由**：GIPHY API Key 是 Beta/Production Key，设计用于客户端（类似 Google Maps API Key），通过 Referrer/Domain 限制而非保密。`@giphy/react-components` 提供开箱即用的 Grid、SearchBar、Carousel 等 React 组件，自带懒加载和响应式布局，无需自己实现。后端代理只会增加延迟和复杂度，没有安全收益。

**配置**：环境变量 `VITE_GIPHY_API_KEY`，Vite 构建时注入。开发环境在 `.env.local` 配置。

### Decision 2：媒体附件数据模型 — Proto 结构化字段 vs JSON 字符串

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. Proto `repeated MediaAttachment` 字段** | 类型安全、前后端共享类型、可扩展 | 需修改 Proto + 生成代码 |
| B. 评论 content 中嵌入特殊标记 | 不改 Proto | 解析逻辑复杂、不安全、XSS 风险 |
| C. 单独的 `string media_url` 字段 | 简单 | 不可扩展、无法区分媒体类型 |

**选择 A**：在 `Comment` 和 `CreateCommentRequest` 中新增 `repeated MediaAttachment media_attachments` 字段（Comment 字段号 14，因 reply_count 已占用 13；CreateCommentRequest 字段号 5）。

**MediaAttachment Proto 定义**：

```protobuf
// 媒体类型
enum MediaType {
  MEDIA_TYPE_UNSPECIFIED = 0;
  MEDIA_TYPE_GIF = 1;        // GIPHY GIF 动图
  MEDIA_TYPE_STICKER = 2;    // GIPHY Sticker（透明背景动图）
  MEDIA_TYPE_IMAGE = 3;      // 普通图片（预留，用于后续图片评论）
}

// 媒体附件
message MediaAttachment {
  // 媒体类型
  MediaType media_type = 1;
  // 原始尺寸 URL
  string url = 2;
  // 预览/缩略图 URL（GIF 的 fixed_height 版本）
  string preview_url = 3;
  // 宽度 (px)
  int32 width = 4;
  // 高度 (px)
  int32 height = 5;
  // GIPHY ID（用于 attribution 和去重）
  string giphy_id = 6;
  // 标题/alt 文本
  string alt_text = 7;
}
```

**理由**：结构化字段保证类型安全、前后端共享类型定义、可扩展（后续加 IMAGE 类型支持图片评论）。`giphy_id` 用于 GIPHY attribution 合规要求（GIPHY ToS 要求显示 "Powered by GIPHY" logo）。

### Decision 3：数据库存储 — JSONB vs 独立关联表

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. comments 表新增 `media_attachments JSONB` 列** | 简单、一次查询、与 Proto 直接映射 | 无法索引/搜索媒体 |
| B. 独立 `comment_attachments` 关联表 | 可独立查询/索引 | 多一次 JOIN、增加复杂度 |

**选择 A**：在 `comments` 表新增 `media_attachments JSONB DEFAULT '[]'` 列。

**理由**：媒体附件是评论的嵌套属性，不需要独立查询或索引。JSONB 存储结构与 Proto 的 `repeated MediaAttachment` 直接对应，序列化/反序列化简单。每条评论最多 1-3 个媒体附件，数据量极小。

### Decision 4：GIPHY SDK 组件架构

```
ExpressionPicker (Tab 容器)
├── Tab 1: 😀 Emoji → 现有 EmojiPicker（保持不变）
├── Tab 2: 🎬 GIF → GiphyGrid (type: "gifs")
│   ├── SearchBar（搜索 GIF）
│   ├── TrendingGrid（默认显示趋势 GIF）
│   └── SearchGrid（搜索结果）
└── Tab 3: ✨ Sticker → GiphyGrid (type: "stickers")
    ├── SearchBar（搜索 Sticker）
    ├── TrendingGrid（默认显示趋势 Sticker）
    └── SearchGrid（搜索结果）
```

**SDK 使用**：
- `GiphyFetch` 实例：`new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY)`
- `Grid` 组件：自带虚拟滚动 + 懒加载 + 瀑布流布局
- `fetchGifs` prop：传入 `gf.trending()`（趋势）或 `gf.search(query)`（搜索）

### Decision 5：评论输入区交互设计

**当前交互**：
```
[评论输入框 textarea]
[😊 表情] [发表评论]
```

**升级后交互**：
```
[评论输入框 textarea]
[已选媒体预览区: GIF/Sticker 缩略图 + 删除按钮]  ← 新增
[😊 表情] [🎬 GIF] [✨ Sticker] [发表评论]        ← 升级工具栏
```

- 点击 😊 → 弹出 Emoji 面板（保持不变）
- 点击 🎬 → 弹出 GIPHY GIF 搜索面板
- 点击 ✨ → 弹出 GIPHY Sticker 搜索面板
- 选择 GIF/Sticker 后显示在预览区，可删除
- 每条评论最多 1 个 GIF 或 1 个 Sticker（避免刷屏）
- 文本和媒体可以共存（先文本后媒体渲染）

### Decision 6：GIPHY Attribution 合规

GIPHY ToS 要求使用其 API 的应用显示 "Powered by GIPHY" logo。

**实现**：
- 在 ExpressionPicker 的 GIF/Sticker Tab 底部显示 GIPHY Attribution Mark
- 使用 `@giphy/react-components` 内置的 attribution（Grid 组件默认包含）
- 评论渲染区域的 GIF/Sticker 右下角小 "via GIPHY" 标记

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| GIPHY API Key 暴露在前端 | 被滥用消耗配额 | GIPHY Key 设计为公开，通过 Dashboard 设置 Domain 限制 |
| GIPHY CDN 在国内可能慢 | GIF 加载延迟 | 使用 GIPHY 的 `fixed_height` / `fixed_width` 小尺寸版本做预览；GIF 格式天然支持渐进加载 |
| 评论刷 GIF 影响阅读体验 | 评论区被大量 GIF 淹没 | 限制每条评论最多 1 个 GIF/Sticker；GIF 默认以小尺寸展示，点击放大 |
| Proto breaking change | 旧版本客户端不识别新字段 | `repeated` 字段向后兼容（旧客户端忽略未知字段），不属于 breaking change |
| GIPHY 服务不可用 | GIF/Sticker 功能失效 | Emoji Tab 作为 fallback 始终可用；GIPHY 选择面板显示错误提示 |

## Open Questions

1. **每条评论的媒体数量限制**：暂定 1 个，是否需要支持多个？社交平台一般限制 1 个 GIF。
2. **GIF 自动播放策略**：评论列表中 GIF 是否自动播放？暂定自动播放小尺寸版本，性能优先可改为 hover 播放。
3. **暗黑模式适配**：GIPHY Grid 组件的暗色主题需要配合 `user-experience-optimization` Change 中的暗黑模式一起测试。
