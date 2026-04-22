## ADDED Requirements

### Requirement: 包基础配置

`@luhanxin/md-parser-core` SHALL 是一个独立于框架的 TypeScript 包，提供 Markdown 解析、渲染、提取、性能优化和渲染引擎能力。

- 包名：`@luhanxin/md-parser-core`
- 版本：0.2.0（pre-release，可破坏性变更）
- 类型：ES Module（`"type": "module"`）
- 构建工具：tsup
- 双入口：主入口 `.` 和 Worker 入口 `./worker`

#### Scenario: 包可被 workspace 内其他包引用

- **WHEN** `apps/main` 或 `packages/md-parser-react` 在 `package.json` 中声明 `"@luhanxin/md-parser-core": "workspace:*"`
- **THEN** `pnpm install` 后可正常 `import` 该包，类型提示完整

#### Scenario: Worker 入口独立可加载

- **WHEN** 通过 `new Worker(new URL('@luhanxin/md-parser-core/worker', import.meta.url), { type: 'module' })` 加载
- **THEN** Worker 线程启动成功，可接收 `WorkerRequest` 消息并返回 `WorkerResponse`

---

### Requirement: 统一解析 Pipeline

`renderMarkdown()` SHALL 通过单次 unified pipeline 一次性产出 `ParseResult`，包含 HTML、TOC、元数据、纯文本、blocks 五种产物，不允许双重解析。

```typescript
interface ParseResult {
  html: string;
  toc: TocItem[];
  meta: ArticleMeta;
  plainText: string;
  blocks: BlockNode[];
}
```

Pipeline 顺序：
1. `remark-parse` → mdast
2. `remark-frontmatter` + `remark-gfm` + `remark-math` + 自定义插件（mention/hashtag/container）
3. 提取阶段：`extractToc` / `extractMeta` / `extractPlainText`（在同一次遍历中完成）
4. `remark-rehype` + `customHandlers`（mdast → hast）
5. 后处理插件：`rehype-heading-ids` / `rehype-external-links` / `rehype-lazy-images` / `rehype-code-meta`
6. `rehype-katex` + `rehype-sanitize` + `rehype-stringify`

#### Scenario: 单次调用获得全部产物

- **WHEN** 调用 `await renderMarkdown(content)`
- **THEN** 返回 `ParseResult` 包含 html/toc/meta/plainText/blocks 五个字段，且未发生第二次 mdast 解析

#### Scenario: 便利方法返回 HTML 字符串

- **WHEN** 调用 `await renderMarkdownToHtml(content)`
- **THEN** 直接返回 HTML string，等价于 `(await renderMarkdown(content)).html`

---

### Requirement: 自定义语法插件

Core 包 SHALL 提供三个自定义 remark 插件：`@用户提及`、`#标签`、`:::容器`，统一通过 `customHandlers`（remark-rehype handlers）映射为标准 hast 元素，使用 `class` 属性（非 JSX 的 `className`）。

- `remark-mention`：识别 `@username`，产出 `MentionNode`，渲染为 `<a class="mention" data-username="...">`
- `remark-hashtag`：识别 `#tag`，产出 `HashtagNode`，渲染为 `<a class="hashtag" data-tag="...">`
- `remark-container`：识别 `:::tip|warning|info|danger [title]` 多行块，产出 `ContainerNode`，渲染为 `<div class="custom-container custom-container-tip">`

#### Scenario: mention 不与邮箱冲突

- **WHEN** 输入 `Contact me at user@example.com or @alice`
- **THEN** 仅 `@alice` 被解析为 mention，`user@example.com` 保持为普通文本

#### Scenario: hashtag 不与标题冲突

- **WHEN** 输入 `# Heading\n\nThis is #rust topic`
- **THEN** `# Heading` 是 h1 标题，`#rust` 被解析为 hashtag

#### Scenario: container 支持多行内容

- **WHEN** 输入 `:::tip 提示\n第一段\n\n第二段\n:::`
- **THEN** 正确解析为 ContainerNode，children 包含两个段落

---

### Requirement: rehype 渲染后处理插件

Core 包 SHALL 提供四个 rehype 后处理插件，对 hast 树做单次 visit 注入交互所需的 DOM 结构和属性：

- `rehype-heading-ids`：为 h1-h6 注入 `id`（slug 化）+ 锚点链接 `<a class="heading-anchor">`
- `rehype-external-links`：外链注入 `target="_blank" rel="noopener noreferrer"`
- `rehype-lazy-images`：所有 `<img>` 注入 `loading="lazy"`
- `rehype-code-meta`：代码块包裹 `<div class="code-block-wrapper">`，添加语言标签 + 复制按钮 DOM

#### Scenario: 标题注入可锚定 id

- **WHEN** 解析 `## API 设计`
- **THEN** 输出 `<h2 id="api-设计">API 设计 <a class="heading-anchor" href="#api-设计">#</a></h2>`

#### Scenario: 外链安全标记

- **WHEN** 文档包含 `[link](https://example.com)`
- **THEN** 输出 `<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>`

#### Scenario: 代码块自动包裹

- **WHEN** 文档包含 ` ```rust\nfn main() {}\n``` `
- **THEN** 输出 `<div class="code-block-wrapper" data-language="rust"><span class="code-block-lang">rust</span><button class="code-block-copy">...</button><pre><code class="language-rust">...</code></pre></div>`

---

### Requirement: Worker 架构

Core 包 SHALL 提供 `WorkerManager` 单例，将大文档解析、Mermaid 渲染、Shiki 高亮卸载到 Web Worker，主线程通过消息协议通信。

- 大文档（content > 5000 字符）自动走 Worker 解析
- Mermaid 始终在 Worker 中渲染 SVG，5s 超时返回错误
- Shiki WASM 在 Worker 中初始化和执行
- 消息去重：相同 content hash 的请求共享同一 Promise
- 通过 `getWorkerManager(options?)` 获取单例，`destroyWorkerManager()` 清理

```typescript
interface WorkerRequest {
  id: string;
  type: 'parse' | 'mermaid';
  payload: ParseWorkerPayload | MermaidWorkerPayload;
}

interface WorkerResponse {
  id: string;
  type: 'parse-result' | 'mermaid-result' | 'error';
  data?: unknown;
  error?: string;
}
```

#### Scenario: 大文档自动卸载

- **WHEN** 调用 `renderMarkdown(content)` 且 `content.length > 5000`
- **THEN** 解析在 Worker 中执行，主线程不阻塞，FPS 不下降

#### Scenario: Mermaid 在 Worker 中渲染

- **WHEN** 文档包含 ` ```mermaid\ngraph TD\nA-->B\n``` `
- **THEN** SVG 字符串通过 Worker 返回，超过 5s 未返回则报错

#### Scenario: 重复请求去重

- **WHEN** 短时间内对同一 content 调用两次 `renderMarkdown`
- **THEN** Worker 只接收一次消息，两个 Promise 解析为同一结果

---

### Requirement: 性能优化层

Core 包 SHALL 提供 LRU 解析缓存和增量解析能力。

- `LRUCache<K, V>`：通用 LRU 容器，构造时指定容量
- `ParseCache`：以 `content + options` 的 hash 为 key，`ParseResult` 为 value，默认容量 50
- `getParseCache()` / `clearParseCache()` 全局单例访问
- `IncrementalParser`：基于行级 diff（`lineDiff`）检测变化区域，复用未变化 block 的 AST 子树

#### Scenario: 缓存命中跳过 pipeline

- **WHEN** 同一 content + options 第二次调用 `renderMarkdown`
- **THEN** 直接返回缓存的 `ParseResult`，未触发 unified pipeline 执行

#### Scenario: 行级 diff 正确识别变化

- **WHEN** 对 `'a\nb\nc'` 和 `'a\nB\nc'` 调用 `lineDiff`
- **THEN** 返回的 `DiffResult` 标记第 1 行为 `changed`，第 0/2 行为 `unchanged`

---

### Requirement: 渲染引擎分级架构

Core 包 SHALL 实现四级 `RenderStrategy` 接口和自动检测/切换机制：

```typescript
interface RenderStrategy {
  readonly name: 'dom' | 'virtual-list' | 'canvas' | 'webgl';
  mount(container: HTMLElement, result: ParseResult): void;
  update(result: ParseResult): void;
  unmount(): void;
  scrollTo(headingId: string): void;
  getVisibleRange(): { startBlock: number; endBlock: number };
}
```

四级策略：
- **Level 0 DomStrategy**：`innerHTML` 直接渲染，最简路径
- **Level 1 VirtualListStrategy**：按 block 粒度虚拟滚动，IntersectionObserver 监听可视区
- **Level 2 CanvasStrategy**：Canvas 2D 文本布局 + DOM overlay 处理交互元素
- **Level 3 WebGLStrategy**：SDF 字体 + 字形 atlas + WebGL2/WebGPU instanced draw

自动切换基于 `DocumentComplexity` 打分（`computeComplexityScore`）：
- score < 50 → dom
- score < 500 → virtual-list
- score < 2000 → canvas
- score >= 2000 → webgl

支持 `fallbackLevel()` 降级（WebGPU → WebGL2 → Canvas → VirtualList → DOM）。

#### Scenario: 复杂度自动选择策略

- **WHEN** 调用 `detectRenderLevel(complexity)` 且 score = 100
- **THEN** 返回 `'virtual-list'`

#### Scenario: 通过工厂创建策略

- **WHEN** 调用 `createRenderEngine({ level: 'dom' })`
- **THEN** 返回实现 `RenderStrategy` 接口的实例，`name === 'dom'`

---

### Requirement: 提取工具

Core 包 SHALL 提供独立可调用的提取工具：

- `extractToc(ast)` → `TocItem[]`：从 mdast 标题层级生成嵌套目录
- `extractMeta(ast)` → `ArticleMeta`：提取 frontmatter + h1 标题 + 字数 + 阅读时间
- `extractPlainText(ast)` → `string`：跳过代码块，提取可读文本
- `countWords(text)` / `estimateReadingTime(text)`：辅助计数

#### Scenario: TOC 嵌套结构正确

- **WHEN** 文档包含 `# A\n## A1\n## A2\n# B`
- **THEN** `extractToc` 返回 `[{id:'a', children:[{id:'a1'},{id:'a2'}]}, {id:'b'}]`

#### Scenario: 元数据合并 frontmatter 和 h1

- **WHEN** 文档包含 frontmatter `title: "T1"` 且正文有 `# T2`
- **THEN** `extractMeta` 返回的 `title` 字段优先取 frontmatter 的 `T1`

---

### Requirement: XSS 防护

Core 包 SHALL 集成 `rehype-sanitize` 和自定义 schema `customSanitizeSchema`，过滤危险标签和属性，同时保留功能性元素（Shiki 高亮、Mermaid SVG、KaTeX 元素、自定义 data-* 属性）。

#### Scenario: script 标签被过滤

- **WHEN** 文档包含 `<script>alert(1)</script>`
- **THEN** 输出 HTML 中不存在 `<script>` 标签

#### Scenario: Mermaid SVG 被保留

- **WHEN** Worker 返回的 Mermaid SVG 经过 sanitize
- **THEN** SVG 元素及其 `viewBox`、`xmlns` 等属性被保留

---

### Requirement: 类型导出

Core 包 SHALL 通过 `index.ts` 导出所有公共类型，供消费者（react/vue 包及外部用户）使用。

必须导出的类型：
- `ParseResult` / `BlockNode`
- `TocItem` / `ArticleMeta`
- `MentionNode` / `HashtagNode` / `ContainerNode`
- `RenderStrategy` / `RenderLevel` / `DocumentComplexity` / `RenderEngineOptions`
- `EventHandlers`
- `WorkerRequest` / `WorkerResponse` / `ParseWorkerPayload` / `MermaidWorkerPayload`
- `ParseOptions` / `RenderOptions`

#### Scenario: 类型可被外部包导入

- **WHEN** `md-parser-react` 或 `md-parser-vue` 中 `import type { ParseResult, EventHandlers } from '@luhanxin/md-parser-core'`
- **THEN** 类型解析成功，TypeScript 编译通过
