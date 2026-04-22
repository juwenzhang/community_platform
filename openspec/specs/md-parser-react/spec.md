# md-parser-react Specification

## Purpose
TBD - created by archiving change markdown-parser-package. Update Purpose after archive.
## Requirements
### Requirement: 包基础配置

`@luhanxin/md-parser-react` SHALL 提供基于 `@luhanxin/md-parser-core` 的 React 18 渲染组件、Hooks、Context Provider 和错误边界。

- 包名：`@luhanxin/md-parser-react`
- 版本：0.2.0
- peerDependencies：`react ^18.0.0`、`react-dom ^18.0.0`
- dependencies：`@luhanxin/md-parser-core: workspace:*`
- 构建工具：tsup（保留 JSX 自动 transform）
- 不打包 CSS（样式由 `@luhanxin/md-parser-theme` 提供）

#### Scenario: 包可被 React 应用引用

- **WHEN** `apps/main` 引入 `import { MarkdownRenderer } from '@luhanxin/md-parser-react'`
- **THEN** 类型提示完整，组件可正常 mount

---

### Requirement: 主渲染组件 MarkdownRenderer

`<MarkdownRenderer>` SHALL 是核心入口组件，整合 `useMarkdown` 解析、`useEventDelegation` 事件代理、`MarkdownErrorBoundary` 错误边界。

Props 至少包含：
- `content: string` — 原始 Markdown 文本
- `className?: string` — 容器自定义类名
- `eventHandlers?: EventHandlers` — 事件回调（mention/hashtag/image/link/code/heading 点击）
- `onTocReady?: (toc: TocItem[]) => void` — TOC 就绪回调
- `onMetaReady?: (meta: ArticleMeta) => void` — 元数据就绪回调
- `debounce?: number` — 防抖毫秒数（默认 150ms）

#### Scenario: 基础渲染

- **WHEN** `<MarkdownRenderer content="# Hello" />`
- **THEN** DOM 中存在带 id 属性的 `<h1>` 元素，文本为 "Hello"

#### Scenario: TOC 回调

- **WHEN** 渲染含多级标题的文档，传入 `onTocReady={fn}`
- **THEN** 解析完成后 `fn` 被调用一次，参数为 `TocItem[]`

#### Scenario: 错误边界容错

- **WHEN** 子组件（如 MermaidDiagram）抛出错误
- **THEN** `MarkdownErrorBoundary` 捕获并显示降级 UI，不影响其他内容渲染

---

### Requirement: 子组件套件

包 SHALL 导出以下独立可用的子组件，类名与 core 输出保持一致（kebab-case）：

| 组件 | 渲染目标 | 关键 className |
|------|---------|---------------|
| `<CodeBlock>` | 代码块 | `code-block-wrapper` / `code-block-lang` / `code-block-copy` |
| `<MermaidDiagram>` | Mermaid 图表 | `mermaid-diagram` |
| `<CustomContainer>` | tip/warning/info/danger 容器 | `custom-container custom-container-{type}` |
| `<Mention>` | @用户提及 | `mention` |
| `<Hashtag>` | #标签 | `hashtag` |
| `<MarkdownErrorBoundary>` | 错误边界 | — |

#### Scenario: 子组件可独立引用

- **WHEN** `import { CodeBlock, MermaidDiagram } from '@luhanxin/md-parser-react'`
- **THEN** 两个组件均存在且可挂载

#### Scenario: 类名与 core 一致

- **WHEN** 用户在 CSS 中通过 `.custom-container-tip` 选择器定义样式
- **THEN** 通过 `dangerouslySetInnerHTML` 渲染的 core 输出和独立 `<CustomContainer>` 组件渲染结果均能命中该样式

---

### Requirement: Hooks 集合

包 SHALL 提供以下 Hook，对等于 Vue 包的 composables：

- **`useMarkdown(content, options?)`** → `{ result: ParseResult | null; loading: boolean; error: Error | null }`
  - 内置 debounce（默认 150ms）
  - 自动复用 `ParseCache`
  - 大文档自动走 Worker
- **`useToc(result)`** → `TocItem[]` — 独立提取或复用 result
- **`useActiveHeading(containerRef)`** → `string | null` — IntersectionObserver 滚动感知，返回当前可视标题 id
- **`useEventDelegation(containerRef, handlers)`** → `void` — 单一容器 click listener 分发到对应回调
- **`useRenderEngine(containerRef, result, options?)`** → `{ strategy: RenderStrategy | null; level: RenderLevel }` — 自动选择并挂载渲染策略
- **`useTextSelection(containerRef)`** → `TextSelectionResult` — 选区感知

#### Scenario: useMarkdown debounce 生效

- **WHEN** 在 100ms 内连续 5 次更新 `content`
- **THEN** 最后一次更新后约 150ms 才触发解析，前 4 次被防抖丢弃

#### Scenario: useActiveHeading 滚动跟随

- **WHEN** 滚动容器使第二个 `<h2>` 进入视口
- **THEN** Hook 返回值变更为该 h2 的 id

#### Scenario: useEventDelegation 派发 mention 点击

- **WHEN** 用户点击带 `class="mention" data-username="alice"` 的元素
- **THEN** `handlers.onMentionClick('alice')` 被调用一次

---

### Requirement: MarkdownProvider Context

包 SHALL 提供 `<MarkdownProvider>` Context，统一注入主题、事件回调、组件覆盖（ComponentOverrides）。

- Provider 接收 `value: MarkdownContextValue`
- 子组件通过 `useMarkdownContext()` 读取
- 支持 `components` 字段允许用户覆盖默认 mention/codeBlock/image 渲染组件

#### Scenario: Context 注入事件

- **WHEN** `<MarkdownProvider value={{ eventHandlers: { onMentionClick } }}>` 包裹 `<MarkdownRenderer>`
- **THEN** 不需重复传 props，mention 点击仍能触发回调

---

### Requirement: 不内置图片上传/水印

包 SHALL 严格遵守 spec Non-goals，不实现编辑器、不实现图片上传、不实现水印添加等编辑期功能。这些能力由后续的 `next-gen-document-editor` change 提供。

#### Scenario: 包导出不包含编辑器组件

- **WHEN** 检查 `index.ts` 的全部导出
- **THEN** 不存在 `Editor`、`ImageUploader`、`Watermark` 等编辑相关导出

