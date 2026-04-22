## Why

当前文章内容使用简单的 `react-markdown` + `remark-gfm` 渲染，只支持基础 Markdown + GFM 语法。作为一个面向开发者的社区平台，这个 Demo 级别的解析能力严重不足：

1. **不支持代码高亮** — 技术文章核心需求缺失，代码块无语法高亮
2. **不支持自定义语法** — 无法扩展平台特有语法（如 `@用户提及`、`#issue引用`、`:::tip 提示框`）
3. **无法提取结构化数据** — 后端只存储原始 Markdown 文本，无法提取 TOC（目录）、元数据、AST 用于搜索和 AI 分析
4. **没有 XSS 防护** — 当前渲染未做 sanitize，存在安全风险
5. **无 Mermaid/PlantUML 支持** — 技术文档常用图表语法无法渲染
6. **无数学公式** — KaTeX/LaTeX 数学公式不支持
7. **前后端不一致** — 后端需要 Markdown→HTML 转换（OG 图片、邮件通知、RSS），当前无统一解析方案
8. **大文档性能问题** — 超长文章（1w+ 字）解析阻塞主线程，Mermaid 图表渲染耗时严重
9. **框架耦合** — 只有 React 渲染组件，管理后台（Vue）无法复用

需要一个统一的前后端 Markdown 解析方案（`@luhanxin/md-parser`），既能满足前端渲染的丰富需求，又能为后端提供 AST 数据和 TOC 提取能力，同时解决性能问题和跨框架复用问题。

## What Changes

### 新建 monorepo 结构 `packages/md-parser/`

采用 monorepo 结构，拆分为三个子包：

```
packages/md-parser/
├── packages/
│   ├── core/                  # @luhanxin/md-parser-core
│   │   ├── 解析器核心（unified 生态）
│   │   ├── 自定义语法插件
│   │   ├── WASM Worker 架构
│   │   └── 独立于框架的类型定义
│   ├── react/                 # @luhanxin/md-parser-react
│   │   ├── React 渲染组件
│   │   └── Hooks（useMarkdown、useToc）
│   └── vue/                   # @luhanxin/md-parser-vue
│       ├── Vue 3 渲染组件
│       └── Composables（useMarkdown、useToc）
```

### 核心能力

- **解析器核心**：基于 `unified` 生态（remark + rehype），支持完整 GFM 扩展
- **WASM Worker 架构**：Mermaid 渲染、大文档 AST 解析、Shiki 高亮移入 Web Worker，不阻塞主线程
- **自定义语法插件**：`@用户提及`、`#issue引用`、`:::tip/warning/info` 容器语法
- **代码高亮**：集成 `shiki`（WASM，零依赖高亮）
- **Mermaid 图表**：集成 `mermaid` 渲染（Worker 中执行）
- **数学公式**：集成 `remark-math` + `rehype-katex`
- **XSS 防护**：集成 `rehype-sanitize`
- **AST 导出**：统一的 AST 数据结构，前后端共用
- **TOC 提取**：自动从标题层级生成目录结构
- **元数据提取**：frontmatter 解析（title/description/tags/date）
- **纯文本提取**：从 Markdown 提取纯文本（用于搜索索引、摘要生成）
- **双框架支持**：React 和 Vue 3 渲染组件，共享核心解析逻辑

### 后端 Rust 版本

后端也需要 Markdown 解析能力（用于 OG 图片生成、邮件通知、搜索索引）。两种方案：

- **方案 A**：Rust 版 `pulldown-cmark`（快速、轻量，但生态不如 unified）
- **方案 B**：通过 WASM 调用前端 md-parser（统一 AST，但有跨语言开销）

本次设计两种方案并存，后端存储优化 change 中具体选择。

## 非目标 (Non-goals)

- **不做编辑器升级** — 本次只做解析和渲染，不涉及编辑器改造（另见 `next-gen-document-editor` change）
- **不做协同编辑** — Yjs/CRDT 等协同能力在编辑器 change 中设计
- **不做实时预览优化** — 编辑器的实时预览在编辑器 change 中设计
- **不做 Markdown 写入/保存** — 本次只关注解析和渲染，不涉及存储变更（另见 `article-storage-optimization` change）
- **不做 SSR 渲染** — 初始版本仅支持 CSR，SSR 支持后续迭代

## 与现有设计文档的关系

- **`docs/design/2026-03-20/02-frontend-architecture.md`** — 本次新增的 packages/md-parser 属于共享包范畴
- **`docs/design/2026-03-20/01-tech-overview.md`** — 前端技术栈新增 unified/rehype 生态
- **`openspec/changes/frontend-app-split/`** — md-parser-react 用于主站（React），md-parser-vue 用于管理后台（Vue 3）

## Capabilities

### New Capabilities

- `md-parser-core`: 统一 Markdown 解析引擎核心 — 支持 GFM + 自定义语法 + AST 导出 + TOC 提取 + XSS 防护，独立于框架
- `md-parser-react`: React 渲染组件库 — 基于 md-parser-core 的 React 组件，支持代码高亮、Mermaid、KaTeX
- `md-parser-vue`: Vue 3 渲染组件库 — 基于 md-parser-core 的 Vue 3 组件，与 React 版本功能一致
- `md-wasm-worker`: WASM Worker 架构 — 将 Mermaid 渲染、大文档解析、Shiki 高亮移入 Web Worker

### Modified Capabilities

- `article-display`: 文章展示升级 — 从简单的 react-markdown 渲染升级为功能完整的 md-parser-react
- `admin-content-display`: 管理后台内容展示 — 使用 md-parser-vue 渲染文章预览
- `article-search`: 文章搜索增强 — 基于 AST 提取的结构化数据改进搜索质量

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `packages/md-parser/` | 新增 | monorepo 结构，含 core/react/vue 三包 |
| `apps/main/src/components/MarkdownRender/` | 重构 | 替换 react-markdown 为 @luhanxin/md-parser-react |
| `apps/admin/` | 新增使用 | 管理后台使用 @luhanxin/md-parser-vue |
| 后端（后续 change） | 新增 | Rust 版 Markdown 解析（存储优化 change 中实施） |

### API 影响

- 无后端 API 变更（纯前端包）

### 依赖影响

新增 npm 依赖：
- `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify`
- `shiki`（代码高亮，WASM）
- `mermaid`（图表渲染）
- `remark-math` + `rehype-katex`（数学公式）
- `rehype-sanitize`（XSS 防护）
- `gray-matter`（frontmatter 解析）

### 测试影响

- md-parser-core 需要完整的单元测试（各种语法的解析正确性）
- XSS 防护测试（sanitize 规则覆盖）
- React/Vue 组件的集成测试
- Worker 通信测试
