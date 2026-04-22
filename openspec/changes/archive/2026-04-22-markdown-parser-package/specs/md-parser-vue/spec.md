## ADDED Requirements

### Requirement: 包基础配置

`@luhanxin/md-parser-vue` SHALL 提供基于 `@luhanxin/md-parser-core` 的 Vue 3 渲染组件、Composables 和 provide/inject Provider。

- 包名：`@luhanxin/md-parser-vue`
- 版本：0.2.0
- peerDependencies：`vue ^3.0.0`
- dependencies：`@luhanxin/md-parser-core: workspace:*`
- 构建工具：vite lib mode + vue-tsc 生成 .d.ts
- 不打包 CSS（样式由 `@luhanxin/md-parser-theme` 提供）

#### Scenario: 包可被 Vue 应用引用

- **WHEN** Vue 应用引入 `import { MarkdownRenderer } from '@luhanxin/md-parser-vue'`
- **THEN** 类型提示完整，组件可正常 mount

---

### Requirement: 主渲染组件 MarkdownRenderer

`<MarkdownRenderer>` SHALL 整合 `useMarkdown` 解析、`useEventDelegation` 事件代理，对等于 React 包能力。

Props 至少包含：
- `content: string`
- `className?: string`
- `eventHandlers?: EventHandlers`
- `debounce?: number`

Emits 至少包含：
- `tocReady` — 参数 `TocItem[]`
- `metaReady` — 参数 `ArticleMeta`

#### Scenario: 基础渲染

- **WHEN** `<MarkdownRenderer :content="'# Hello'" />`
- **THEN** DOM 中存在带 id 属性的 `<h1>` 元素

#### Scenario: tocReady 事件触发

- **WHEN** 父组件监听 `@toc-ready="onToc"`
- **THEN** 解析完成后 `onToc` 被调用一次，参数为 `TocItem[]`

#### Scenario: emit 调用规范

- **WHEN** 组件内部需要触发事件
- **THEN** 直接调用 `emit('toc-ready', toc)`，不接受 emit 返回值（避免 Vue 3 emit 返回值误用 bug）

---

### Requirement: 子组件套件

包 SHALL 导出以下独立可用的 Vue SFC 组件，类名与 core 保持一致（kebab-case）：

| 组件 | className |
|------|-----------|
| `<CodeBlock>` | `code-block-wrapper` / `code-block-lang` / `code-block-copy` |
| `<MermaidDiagram>` | `mermaid-diagram`，securityLevel 设为 `'strict'` |
| `<CustomContainer>` | `custom-container custom-container-{type}` |
| `<Mention>` | `mention` |
| `<Hashtag>` | `hashtag` |

子组件 SHALL **不携带 scoped CSS**（样式统一由 theme 包提供），避免双重维护。

#### Scenario: 组件无 scoped 样式

- **WHEN** 检查 `CodeBlock.vue` / `MermaidDiagram.vue` / `CustomContainer.vue` 等子组件源码
- **THEN** 不存在 `<style scoped>` 块或仅保留布局必需的最小 scoped 样式

#### Scenario: Mermaid 安全等级

- **WHEN** 检查 `MermaidDiagram.vue` 的 mermaid.initialize 配置
- **THEN** `securityLevel === 'strict'`

---

### Requirement: Composables 集合

包 SHALL 提供以下 composable，对等于 React 包的 hooks：

- **`useMarkdown(content, options?)`** → `{ result: Ref<ParseResult | null>; loading: Ref<boolean>; error: Ref<Error | null> }`
  - 内置 debounce
  - 自动复用 `ParseCache`
  - 大文档走 Worker
- **`useToc(result)`** → `Ref<TocItem[]>`
- **`useActiveHeading(containerRef)`** → `Ref<string | null>`
- **`useEventDelegation(containerRef, handlers)`** → `void`
- **`useTextSelection(containerRef)`** → `TextSelectionResult`

#### Scenario: onMounted 清理无泄漏

- **WHEN** 组件 unmount 时
- **THEN** `useEventDelegation`、`useActiveHeading` 注册的事件监听和 IntersectionObserver 全部正确清理

#### Scenario: 消除双重解析

- **WHEN** 组件接收 content prop 并触发 useMarkdown
- **THEN** 单次 unified pipeline 调用产出 ParseResult，不再额外触发 parseMarkdownToAst

---

### Requirement: provide/inject Provider

包 SHALL 提供 `provideMarkdownContext()` 和 `useMarkdownContext()` 实现 Vue 风格的全局 Provider，对等于 React 的 Context。

#### Scenario: Provider 注入事件回调

- **WHEN** 父组件调用 `provideMarkdownContext({ eventHandlers: { onMentionClick } })`
- **THEN** 后代 `<MarkdownRenderer>` 不需要重复传 props，mention 点击仍可触发回调

---

### Requirement: 不内置编辑器功能

包 SHALL 严格遵守 spec Non-goals，不实现编辑器、不实现图片上传、不实现水印添加等编辑期功能。

#### Scenario: 包导出不包含编辑器组件

- **WHEN** 检查 `index.ts` 的全部导出
- **THEN** 不存在 `Editor`、`ImageUploader` 等编辑相关导出
