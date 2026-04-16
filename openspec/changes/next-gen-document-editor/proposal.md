## Why

当前文章编辑器是 Demo 级别的 textarea 左右分栏 + react-markdown 预览，完全无法支撑一个面向开发者的内容创作平台。需要一个类似飞书文档/语雀文档的新一代编辑器：

1. **块编辑器** — 当前是纯文本 textarea，无法支持富文本块（标题块、代码块、图片块、引用块、表格块等）
2. **协同编辑** — 多人同时编辑一篇文章，实时看到对方的光标和修改（Yjs + CRDT）
3. **版本历史** — 无法查看文章的历史版本，无法回滚
4. **独立创作空间** — 每个用户有自己的工作台（草稿、已发布、协作中），不只是简单的编辑页面
5. **公开分享** — 用户可以控制文章的可见性（公开/私密/链接分享）
6. **Slash 命令** — 输入 `/` 弹出命令面板，快速插入各种块类型
7. **Markdown 导入导出** — 支持从 Markdown 导入为块编辑器格式，以及导出为 Markdown
8. **渲染性能优化** — 大文档（1w+ 字）只读模式渲染性能优化路径
9. **数据丢失防护** — 自动保存、冲突恢复、离线编辑

这是一个极其复杂的特性，复杂度属于 ⭐⭐⭐⭐⭐ 级别。**建议拆分为 3 个独立 change**：

| Change | 范围 | 复杂度 |
|--------|------|--------|
| **editor-core** | TipTap 块编辑器 + Slash 命令 + Markdown 双向 | ⭐⭐⭐ |
| **editor-collab** | Yjs 协同编辑 + 版本历史 | ⭐⭐⭐⭐ |
| **editor-workspace** | 用户创作空间 + 公开分享 + 模板系统 | ⭐⭐⭐ |

本次 `next-gen-document-editor` change 仅包含 **editor-core**，为后续协同和创作空间打基础。

## What Changes

### 新建 `@luhanxin/editor` 包

- 基于 **TipTap**（ProseMirror 封装）的块编辑器框架
- 内置块类型：段落、标题、代码块（带语言选择和 shiki 高亮）、图片、引用、分隔线、列表、表格、数学公式、Mermaid 图表
- Slash 命令面板（输入 `/` 快速插入）
- 拖拽排序块
- Markdown 快捷键（自动转换 `#` → 标题、`>` → 引用等）
- Markdown 双向转换（编辑器 ↔ Markdown）

### 渲染性能迭代路径

编辑器的**只读模式（文章详情页）**需要性能优化路径：

| 阶段 | 渲染方式 | 适用场景 | 性能基准 |
|------|---------|---------|---------|
| **Phase 1** | DOM 渲染 | 小文档（< 5000 字） | 基准 |
| **Phase 2** | DOM + 虚拟列表 | 中文档（5000-20000 字） | FPS > 55 |
| **Phase 3** | Canvas 渲染 | 大文档（20000-100000 字） | FPS > 50 |
| **Phase 4** | WebGL/WebGPU | 超大文档（> 100000 字） | FPS > 45 |

**初期仅实现 Phase 1 和 Phase 2**，Phase 3/4 作为未来迭代。

### 自动保存与数据丢失防护

- **自动保存**：每 30s 自动保存到 IndexedDB + 后端
- **离线编辑**：IndexedDB 缓存，网络恢复后同步
- **冲突恢复**：多设备编辑时提示冲突，提供合并选项
- **版本快照**：每次保存自动生成快照（保留最近 10 个草稿版本）

### 编辑器工具栏

- 浮动工具栏（选中文字时出现）
- 固定底部工具栏
- Bubble Menu
- Block Menu

## 非目标 (Non-goals)

- **不做协同编辑** — 在独立的 `editor-collab` change 中实现
- **不做用户创作空间** — 在独立的 `editor-workspace` change 中实现
- **不做全文协同编辑** — 协同编辑仅限同一篇文章，不做频道/聊天室式的实时协同
- **不做评论/批注** — 文档内的批注系统在后续 change
- **不做 AI 写作助手** — AI 辅助写作在 `ai-article-summary` change 中
- **不做移动端适配** — 移动端编辑器 UI 在后续优化
- **不做 Canvas/WebGL 渲染** — 仅设计接口，后续迭代实现

## 与现有设计文档的关系

- **`openspec/changes/markdown-parser-package/`** — 编辑器的代码高亮和渲染复用 md-parser
- **`openspec/changes/frontend-app-split/`** — 编辑器作为 `packages/editor` 包，被 article 子应用引用
- **`openspec/changes/article-storage-optimization/`** — 编辑器内容需要新的存储格式（JSON 块数据）

## Capabilities

### New Capabilities

- `block-editor`: 块编辑器 — TipTap + 自定义块 + Slash 命令 + 拖拽排序 + Markdown 双向转换
- `editor-renderer`: 编辑器渲染器 — DOM 渲染 + 虚拟列表优化（预留 Canvas/WebGL 接口）
- `editor-autosave`: 自动保存 — IndexedDB 缓存 + 定时保存 + 冲突恢复
- `editor-toolbar`: 编辑器工具栏 — 浮动工具栏 + 底部工具栏 + Bubble/Block Menu

### Modified Capabilities

- `article-creation`: 文章创建流程 — 从 textarea 升级为块编辑器
- `article-storage`: 文章存储格式 — 新增 JSON 块数据存储（与 Markdown 共存）

## Impact

### 代码影响

| 范围 | 变更类型 |
|------|---------|
| `packages/editor/` | 新增 |
| `apps/article/` (拆分后) | 修改（使用新编辑器） |
| Proto | 修改（新增块数据格式） |
| 后端 | 修改（新增文章 JSON 块数据字段） |

### 依赖影响

新增依赖：`@tiptap/core`、`@tiptap/extension-*`、`@tiptap/react`、`prosemirror-*` 等

### 复杂度

高 — 预估 80 小时开发量
