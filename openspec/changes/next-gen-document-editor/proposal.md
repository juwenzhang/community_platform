## Why

当前文章编辑器 `apps/main/src/components/ArticleEditor/index.tsx` 是 **textarea + 左右分栏 Markdown 预览** 的简易实现：

| 维度 | 现状 | 问题 |
|------|------|------|
| 编辑模型 | 纯文本 textarea | 用户必须手写 Markdown 标记，对非技术作者门槛高 |
| 块类型 | 无（全是文本） | 无法做拖拽排序、块级操作（删除/复制/折叠） |
| 富交互 | 无 Slash 命令、无 Bubble Menu | 插入图片/表格/代码块需手动输入 Markdown 语法 |
| 数据安全 | 无草稿、无自动保存、无离线 | 浏览器崩溃/网络断开 = 内容全部丢失 |
| 长文写作体验 | 滚动不分块、无大纲跳转、无字数统计 | 长篇技术文章编辑体验粗糙 |
| 可扩展性 | 与 `MarkdownRender` 强耦合 | 后续协同编辑、模板、AI 续写均无落脚点 |

需要升级为类 **飞书文档 / 语雀 / Notion** 的块编辑器。基础设施已就绪：
- `@luhanxin/md-parser-react` 已沉淀（仅负责**只读渲染**，详情页消费）
- `markdown-parser-polish` 待启动（负责样式抛光与主站只读渲染接入）
- `article-storage-optimization` 已规划（后端 AST 存储改造）

本 change **只做编辑态**，与上述能力清晰解耦。

## What Changes

### 新建 `@luhanxin/doc-editor` 包

基于 **TipTap v2**（ProseMirror 封装）的块编辑器框架，提供完整的编辑态能力：

| 模块 | 职责 |
|------|------|
| `core/` | TipTap Editor 实例封装、ProseMirror schema、扩展注册中心 |
| `blocks/` | 自定义块扩展（代码块/图片/表格/Mermaid/数学公式/容器/分隔线/任务列表）|
| `slash/` | Slash 命令面板（输入 `/` 弹出块插入菜单）|
| `menu/` | BubbleMenu（选区浮层）+ FloatingMenu（行级操作菜单）|
| `convert/` | Markdown ↔ ProseMirror JSON 双向转换 |
| `autosave/` | IndexedDB 草稿存储 + 防抖自动保存 + 保存状态指示 |
| `react/` | React 集成层（`<DocEditor>` 组件、`useDocEditor` hook）|

### 主站编辑器接入

- 重写 `apps/main/src/components/ArticleEditor/`：从 textarea 改为 `<DocEditor>`
- 移除「左右分栏预览」UI（块编辑器是 WYSIWYG，不需要预览面板）
- 编辑器输出仍为 Markdown 字符串，调用 `useArticleStore.updateArticle({ content })` —— **后端 API 完全不变**
- 文章详情页（只读）继续走 `markdown-parser-polish` change 的 `<MarkdownRenderer>`

### 与现有能力的边界

| 能力 | 谁负责 |
|------|--------|
| **编辑态渲染** | 本 change（TipTap） |
| **只读态渲染** | `markdown-parser-polish`（`@luhanxin/md-parser-react`）|
| **代码高亮** | TipTap 内置 lowlight；只读态走 md-parser-core 的 Shiki |
| **图片上传服务** | **复用现有** `/api/v1/upload/sign` + Cloudinary 直传（见 `AvatarUpload` 实现）|
| **后端存储格式** | 由 `article-storage-optimization` 决定；本 change 输出 Markdown 字符串 |
| **草稿持久化** | 本 change（仅前端 IndexedDB）|
| **后端版本快照** | **不做**（属于未来的 `editor-versioning` change）|

### 架构留口：为未来独立应用化做准备

本 change 交付形态是 `packages/doc-editor/` 共享包，但**包的 API 设计严格遵循"不耦合宿主"原则**，为未来升级为独立 Garfish 子应用 `apps/doc-editor/` 留好口子。具体约束：

- 所有外部能力（上传、保存、鉴权、国际化）通过 props 或 Provider 注入，**不直接 import 宿主 app 的 store**
- 样式独立，不依赖宿主的 antd 主题或 CSS 变量（如有依赖，必须通过 CSS 变量提供默认值）
- 国际化通过 `locale` prop 注入，不绑定特定 i18n 框架
- 输出物（Markdown 字符串）是纯数据，不耦合任何业务模型

**两步走路线**：

```
阶段 1（本 change）: packages/doc-editor/ 共享包
    ↓ 当且仅当以下任一条件成立时升级：
    ↓   (a) 编辑器场景 ≥ 3 个（文章 + 评论 + wiki / 私信 ...）
    ↓   (b) 产品需要独立域名 editor.luhanxin.com
    ↓   (c) 协同编辑 change 启动（独立 WebSocket 连接更自然）
阶段 2（未来 change）: apps/doc-editor/ 独立 Garfish 子应用
    ↓
阶段 3（产品成熟）: editor.luhanxin.com 独立站点
```

## 非目标 (Non-goals)

- **不做协同编辑（CRDT/Yjs）** — 单独的 `editor-collab` change
- **不做后端版本快照存储** — 属于 `editor-versioning` change（待建）
- **不做用户创作空间 / 文章模板** — 属于 `editor-workspace` change（待建）
- **不做 AI 续写 / 智能改写** — 属于 `ai-writing-assistant` change（待建）
- **不做评论批注 / 内联评论** — 属于 `inline-comments` change（待建）
- **不引入新的存储字段或 Proto 变更** — 编辑器输出 Markdown 字符串，复用现有 `Article.content` 字段
- **不引入自定义 Canvas/WebGL 渲染** — 编辑态用 ProseMirror DOM；md-parser-core 已有的渲染引擎分级用于只读态
- **不做移动端编辑器 UI** — 后续 `editor-mobile` change
- **不做现有文章数据迁移脚本** — 现有 Markdown 文章天然兼容（编辑器加载时自动 `markdownToJSON`）
- **不把编辑器升级为独立 Garfish 子应用** — 本 change 交付 `packages/doc-editor/` 共享包；独立应用化由未来的 `editor-standalone-app` change 承接
- **不新建图片上传服务** — 复用现有 Cloudinary 直传（`/api/v1/upload/sign`）

## 与现有设计文档的关系

| 文档 / Change | 关系 |
|---------------|------|
| `openspec/specs/md-parser-core/spec.md` | **不依赖** — 编辑态独立于只读渲染管线 |
| `openspec/specs/md-parser-react/spec.md` | **不依赖** — 详情页才用 |
| `openspec/changes/markdown-parser-polish/` | **并行** — polish 负责详情页，本 change 负责编辑页 |
| `openspec/changes/article-storage-optimization/` | **后端契约不变** — 本 change 不引入新字段 |
| `openspec/specs/article-store/spec.md` | **复用** — 通过 `useArticleStore.updateArticle({ content: markdown })` 保存 |
| `docs/design/2026-03-20/02-frontend-architecture.md` | 编辑器作为 `packages/doc-editor` 共享包 |

## Capabilities

### New Capabilities

- `doc-editor-package`: `@luhanxin/doc-editor` 包契约 — TipTap 封装、ProseMirror schema、扩展注册、React 集成层
- `editor-blocks`: 块类型与 Slash 命令契约 — 自定义块扩展集合 + 命令面板交互
- `editor-autosave`: 草稿存储与自动保存契约 — IndexedDB 持久化 + 防抖保存 + 状态指示

### Modified Capabilities

- `article-editor-integration`: 主站编辑器接入契约 — 替换 `apps/main/src/components/ArticleEditor/`，从 textarea 升级为块编辑器，保持后端 API 不变

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `packages/doc-editor/` | **新增** | 全新包，含 7 个模块 |
| `apps/main/src/components/ArticleEditor/index.tsx` | **重写** | textarea → `<DocEditor>` |
| `apps/main/src/components/ArticleEditor/articleEditor.module.less` | **重写** | 移除分栏样式 |
| `apps/main/src/pages/post/pages/edit/index.tsx` | **小改** | 调整 props 传递（如有） |
| Proto 定义 | **不变** | 编辑器输出 Markdown，复用 `Article.content` |
| 后端服务 | **不变** | 无需任何后端改造 |

### 依赖影响

新增前端依赖（`packages/doc-editor`）：
- `@tiptap/core` `@tiptap/pm` `@tiptap/react`
- `@tiptap/starter-kit`（基础块：段落/标题/粗体/斜体/引用/列表等）
- `@tiptap/extension-link` `@tiptap/extension-image` `@tiptap/extension-table` `@tiptap/extension-task-list`
- `@tiptap/extension-code-block-lowlight` + `lowlight`（代码块高亮）
- `@tiptap/extension-mathematics`（KaTeX 公式，可选）
- `@tiptap/suggestion`（Slash 命令基础）
- `idb`（IndexedDB 友好封装）
- `tippy.js`（菜单浮层定位）

`apps/main` **不**新增 `@tiptap/*` 直接依赖，仅依赖 `@luhanxin/doc-editor`。

### 包体积影响

预估 `@luhanxin/doc-editor` gzip 后约 200-300KB（TipTap + ProseMirror + lowlight 子集）。通过：
- 编辑器代码以路由级 lazy import 加载（仅编辑页加载）
- lowlight 按需注册语言（只注册常用 20 种）
- TipTap 扩展按需引入

### 测试影响

- 新增编辑器单元测试（schema、扩展、转换器）
- 新增 IndexedDB 草稿测试
- 新增 Markdown 双向转换 round-trip 测试（`md → JSON → md` 等价性）
- 新增主站集成 E2E 测试（编辑、保存、草稿恢复）

### 性能预算

| 指标 | 目标 |
|------|------|
| 编辑器首屏加载（含懒加载）| < 500ms（在 4G 网络） |
| 输入响应延迟 | < 16ms（60 FPS） |
| 草稿写入 IndexedDB | < 50ms |
| Markdown ↔ JSON 转换（10k 字）| < 100ms |
