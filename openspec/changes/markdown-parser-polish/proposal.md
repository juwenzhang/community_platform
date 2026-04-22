## Why

`markdown-parser-package` change（已归档）完成了 5 个包（core/react/vue/theme + 2 demo）的架构搭建和基础能力实现，但归档时明确遗留以下问题，需在主站铺开使用前解决：

1. **视觉精致度不足** — 当前样式停留在「能用」阶段，与语雀/掘金/Notion 等技术社区的渲染体验有明显差距：
   - 标题层级缺乏对比和呼吸感
   - 代码块缺少美化的 wrapper、复制按钮交互生硬
   - tip/warning/info/danger 容器配色单调，无图标
   - Mermaid 图表无卡片化容器，loading/error 状态视觉粗糙
   - 表格、引用、列表的间距和字号未做精细调校
   - 暗色模式未支持

2. **Markdown case 覆盖不全** — 真实文章中常见但当前未验证的场景：
   - 脚注（`[^1]`）
   - 嵌套引用块（`> > nested`）
   - 长表格的横向滚动
   - HTML 内嵌（`<details>` / `<summary>` / `<kbd>` 等）
   - 转义字符（`\*` / `\_` / `\\`）
   - 复杂列表（任务列表 + 嵌套 + 代码块混排）
   - 代码块内的特殊字符和超长行
   - 数学公式的复杂场景（矩阵、对齐环境）
   - 自定义语法的边界 case（@username 在引用/代码块中应不解析等）

3. **未接入主站** — `apps/main/src/components/MarkdownRender/index.tsx` 仍使用 `react-markdown` + `remark-gfm` + `remark-breaks`，未替换为 `@luhanxin/md-parser-react`。文章详情页（`pages/post/pages/detail`）和编辑器预览（`components/ArticleEditor`）都需要切换。

4. **缺少回归测试** — 没有真实文章数据（如平台已有文章、技术博客典型文档）的端到端渲染回归。

## What Changes

### 视觉抛光（theme 包）

- 重新设计标题排版（参考语雀/掘金）：字号阶梯、行高、margin、border-bottom（h1/h2）
- 代码块美化：圆角 wrapper、深色背景、语言 tag 优化、复制按钮 hover/active 动画、代码字体（JetBrains Mono / Fira Code）
- 自定义容器图标化：tip/warning/info/danger 各配 icon + 左侧色条 + 标题加粗
- Mermaid 卡片化：圆角白色卡片 + 阴影 + 居中 + 加载骨架
- KaTeX display 模式居中 + 横向滚动适配
- 表格：斑马纹、hover、横向滚动指示器
- mention/hashtag：Pill 样式、hover 过渡
- heading-anchor：默认隐藏，标题 hover 时淡入
- 暗色模式：通过 `[data-theme="dark"]` 选择器覆盖 CSS 变量

### Case 覆盖审计

- 创建 `packages/md-parser-core/__tests__/cases/` 目录，按场景组织测试用例
- 列出「Markdown 渲染能力支持矩阵」文档（`docs/tech/`），逐项标记支持状态
- 缺失能力：补 remark/rehype 插件（如 `remark-footnotes`）或补自定义处理
- 添加 fuzz 测试：随机生成的 Markdown 不应导致解析崩溃

### 主站接入

- `apps/main/src/components/MarkdownRender/index.tsx` 替换为 `@luhanxin/md-parser-react`
- `apps/main` 引入 `@luhanxin/md-parser-theme` 全局 CSS
- 兼容现有 `CopyableCodeBlock` 组件（评估是否合并到 md-parser-react 的 CodeBlock）
- 文章详情页 / 编辑器预览 / 评论预览 全部切换
- 准备灰度回滚开关（feature flag）

### 真实文章回归

- 抓取平台已有文章（或准备 10-20 篇典型技术文档）作为回归集
- 截图对比（react-markdown 旧渲染 vs md-parser-react 新渲染）
- 列出 diff 报告，逐项确认是改进还是回归

## 非目标 (Non-goals)

- **不改变 md-parser-* 包的公共 API** — 仅做样式、case 覆盖、接入工作；如需新 API，单独提 change
- **不做编辑器升级** — 编辑器在 `next-gen-document-editor` change 中处理
- **不做后端 Markdown 解析** — 后端解析在 `article-storage-optimization` change 中处理
- **不做 SSR 渲染** — 维持当前 CSR
- **不做协同编辑/实时预览优化** — 编辑器范畴
- **不引入新框架支持** — 暂不做 Svelte/Solid 等
- **不做 Mermaid/KaTeX 之外的图表/公式引擎** — 不引入 PlantUML、AsciiMath 等

## 与现有设计文档的关系

- **承接 `archive/2026-04-22-markdown-parser-package/`** — 复用其 5 个 capability spec（`md-parser-core/react/vue/theme`），仅做增强
- **`docs/design/2026-03-20/02-frontend-architecture.md`** — md-parser 主站接入方案
- **被依赖于 `next-gen-document-editor`** — 编辑器需要稳定且美观的渲染输出

## Capabilities

### Modified Capabilities

- `md-parser-theme`: 视觉重设计 — 排版、代码块、容器、Mermaid、KaTeX、表格、mention/hashtag 全面美化；新增暗色模式支持
- `md-parser-core`: Markdown case 覆盖增强 — 补足脚注、HTML 内嵌、复杂列表等边界 case；新增渲染能力支持矩阵文档
- `markdown-rendering` (新): 主站 Markdown 渲染统一收敛 — `apps/main` 全部 Markdown 渲染入口替换为 `@luhanxin/md-parser-react`

### New Capabilities

- `markdown-rendering`: 主站 Markdown 渲染契约 — 定义文章详情、编辑器预览、评论预览的统一渲染入口、主题加载方式、性能预算

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `packages/md-parser-theme/src/index.css` | 重大重写 | 视觉抛光，新增暗色模式 |
| `packages/md-parser-core/src/__tests__/cases/` | 新增 | 边界 case 测试集 |
| `packages/md-parser-core/src/plugins/` | 增量 | 视情况补 remark-footnotes 等 |
| `apps/main/src/components/MarkdownRender/` | 重写 | 替换 react-markdown 为 md-parser-react |
| `apps/main/src/components/CopyableCodeBlock/` | 评估 | 可能并入 md-parser-react 的 CodeBlock |
| `apps/main/src/main.tsx` | 增量 | 引入 theme 包 CSS |
| `docs/tech/` | 新增 | Markdown 渲染能力支持矩阵 |

### API 影响

- 不修改 md-parser-* 任何包的公共导出
- 不修改后端 API

### 依赖影响

- 视情况新增：`remark-footnotes` 等小型插件
- `apps/main` 移除：`react-markdown` / `remark-gfm` / `remark-breaks` / `rehype-slug`（替换完成后）

### 测试影响

- 新增边界 case 单元测试（约 30-50 个 case）
- 新增视觉回归（截图对比）
- 新增主站集成测试
