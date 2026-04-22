# md-parser-theme Specification

## Purpose
TBD - created by archiving change markdown-parser-package. Update Purpose after archive.
## Requirements
### Requirement: 包基础配置

`@luhanxin/md-parser-theme` SHALL 是一个纯 CSS 样式包，提供 md-parser 渲染产物的默认主题，与 React/Vue 包完全解耦。

- 包名：`@luhanxin/md-parser-theme`
- 版本：0.2.0
- 入口：`./dist/index.css`（exports 字段：`"."` 和 `"./index.css"` 均指向同一文件）
- 无 JavaScript 代码
- 无运行时依赖
- 构建：`cp src/index.css dist/index.css`（无需打包工具）

#### Scenario: 包可被任意应用引用

- **WHEN** Demo / 主站 / 管理后台在入口文件 `import '@luhanxin/md-parser-theme'`
- **THEN** 全局 CSS 生效，markdown-body 等样式正常应用

#### Scenario: 不依赖 React/Vue

- **WHEN** 在纯 HTML 项目中引入该包的 CSS
- **THEN** 样式可直接对配套 HTML 结构生效，无需任何运行时

---

### Requirement: 类名规范统一为 kebab-case

样式 SHALL 全部使用 kebab-case 类名，与 `md-parser-core` 的 hast-handlers 和 rehype-code-meta 输出保持一致，是整个 md-parser 系列包的**唯一类名真相源**。

涉及的核心类名：
- `.markdown-body` — 容器
- `.code-block-wrapper` / `.code-block-lang` / `.code-block-copy` — 代码块
- `.custom-container` / `.custom-container-tip` / `.custom-container-warning` / `.custom-container-info` / `.custom-container-danger` — 容器
- `.mention` / `.hashtag` — 自定义语法
- `.mermaid-diagram` — Mermaid 图表
- `.heading-anchor` — 标题锚点
- `.katex-display` — KaTeX 数学公式

#### Scenario: 无 camelCase 残留

- **WHEN** 全文 grep 检查 `src/index.css`
- **THEN** 不存在 `.markdownBody` / `.codeBlockWrapper` / `.mermaidDiagram` 等 camelCase 类名

#### Scenario: React/Vue 输出能命中样式

- **WHEN** core 通过 `dangerouslySetInnerHTML` / `v-html` 注入 HTML
- **THEN** core 输出的 kebab-case 类名能被 theme 包样式正确选中

---

### Requirement: 样式覆盖范围

theme 包 SHALL 至少提供以下视觉模块的默认样式：

1. **基础排版**：标题（h1-h6）、段落、列表、引用、水平线、链接
2. **GFM 元素**：表格、任务列表、删除线
3. **代码**：行内 code、代码块（含语言标签、复制按钮、wrapper）
4. **自定义容器**：tip/warning/info/danger 四种主题色
5. **自定义语法**：mention/hashtag 链接样式
6. **数学公式**：KaTeX display/inline 模式
7. **Mermaid 图表**：容器和 loading/error 状态
8. **响应式**：移动端断点适配
9. **加载状态**：`.markdown-skeleton` / loading 占位

#### Scenario: 类名与组件 JSX 一致

- **WHEN** React 包 JSX 使用 `<div className="markdown-skeleton">` 表示加载占位
- **THEN** theme 包提供 `.markdown-skeleton` 样式，加载状态可视化生效

#### Scenario: KaTeX 类名一致

- **WHEN** rehype-katex 输出 `<span class="katex-display">`
- **THEN** theme 包以 `.katex-display` 选择器命中该元素

---

### Requirement: 与 React/Vue 包的样式分离

React 和 Vue 包 SHALL **不打包 CSS**，所有视觉样式由 theme 包统一提供，避免重复定义和样式漂移。

- React 包 `tsup.config.ts` 不包含 CSS entry
- Vue 包 SFC 不使用 `<style scoped>`（或仅保留 layout-only 必需的最小 scoped）
- React/Vue 包的 `package.json` `exports` 字段不导出 CSS

#### Scenario: React 包 dist 无 CSS

- **WHEN** 构建后检查 `packages/md-parser-react/dist/`
- **THEN** 不存在 `.css` 文件

#### Scenario: Vue 包 dist 无 CSS

- **WHEN** 构建后检查 `packages/md-parser-vue/dist/`
- **THEN** 不存在 `.css` 文件（vite lib mode 输出仅 .js + .d.ts）

