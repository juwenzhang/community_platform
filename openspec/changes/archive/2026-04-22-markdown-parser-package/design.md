## Context

当前文章 Markdown 渲染使用 `react-markdown` + `remark-gfm`，仅支持基础 Markdown 和 GFM 语法。作为一个面向开发者的社区平台，技术文章需要更丰富的渲染能力。

**现有渲染组件**：`apps/main/src/components/MarkdownRender/index.tsx`

```tsx
// 当前实现（简化）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRender({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**问题**：
1. 功能不足（无高亮、无图表、无公式）
2. 大文档（1w+ 字）解析阻塞主线程
3. Mermaid 图表渲染耗时严重（复杂流程图可达 1-2s）
4. 只有 React 版本，管理后台（Vue 3）无法复用

需要升级为基于 `unified` 生态的完整解析方案，采用 WASM Worker 架构，并提供 React 和 Vue 双框架支持。

## Goals / Non-Goals

**Goals:**

1. 建立统一的 Markdown 解析方案（前后端共用 AST 结构）
2. 支持 GFM + 代码高亮（shiki）+ Mermaid + KaTeX 数学公式
3. 支持平台自定义语法（@提及、#引用、:::容器）
4. 提供 AST 导出和 TOC 提取能力
5. XSS 防护（rehype-sanitize）
6. 提供纯文本提取能力（用于搜索索引）
7. frontmatter 解析（元数据提取）
8. **WASM Worker 架构** — Mermaid 渲染、大文档解析、Shiki 高亮移入 Web Worker
9. **双框架支持** — 提供 React 和 Vue 3 渲染组件

**Non-Goals:**

- 不做编辑器改造
- 不做协同编辑
- 不做后端 Rust 解析实现（后续 change）
- 不做 Markdown 写入/存储
- 不做 SSR 渲染（后续迭代）

## Decisions

### Decision 1: monorepo 结构设计

采用 monorepo 结构，拆分为三个子包：

```
packages/md-parser/
├── packages/
│   ├── core/                      # @luhanxin/md-parser-core
│   │   ├── src/
│   │   │   ├── index.ts           # 导出所有公共 API
│   │   │   ├── core/
│   │   │   │   ├── parse.ts       # Markdown → mdast AST
│   │   │   │   ├── render.ts      # mdast → hast → HTML string
│   │   │   │   ├── extract-toc.ts # 从 AST 提取 TOC
│   │   │   │   ├── extract-text.ts# 从 AST 提取纯文本
│   │   │   │   └── extract-meta.ts# frontmatter 元数据提取
│   │   │   ├── plugins/
│   │   │   │   ├── remark-mention.ts
│   │   │   │   ├── remark-hashtag.ts
│   │   │   │   └── remark-container.ts
│   │   │   ├── worker/
│   │   │   │   ├── index.ts       # Worker 入口
│   │   │   │   ├── mermaid.ts     # Mermaid 渲染 Worker
│   │   │   │   ├── highlight.ts   # Shiki 高亮 Worker
│   │   │   │   └── parse.ts       # 大文档解析 Worker
│   │   │   ├── types/
│   │   │   │   ├── ast.ts
│   │   │   │   ├── toc.ts
│   │   │   │   └── meta.ts
│   │   │   └── sanitize/
│   │   │       └── schema.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── react/                     # @luhanxin/md-parser-react
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── components/
│   │   │   │   ├── CodeBlock.tsx
│   │   │   │   ├── MermaidDiagram.tsx
│   │   │   │   ├── MathFormula.tsx
│   │   │   │   ├── CustomContainer.tsx
│   │   │   │   ├── Mention.tsx
│   │   │   │   └── Hashtag.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMarkdown.ts
│   │   │   │   └── useToc.ts
│   │   │   └── styles/
│   │   │       └── index.module.less
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── vue/                       # @luhanxin/md-parser-vue
│       ├── src/
│       │   ├── index.ts
│       │   ├── MarkdownRenderer.vue
│       │   ├── components/
│       │   │   ├── CodeBlock.vue
│       │   │   ├── MermaidDiagram.vue
│       │   │   ├── MathFormula.vue
│       │   │   ├── CustomContainer.vue
│       │   │   ├── Mention.vue
│       │   │   └── Hashtag.vue
│       │   ├── composables/
│       │   │   ├── useMarkdown.ts
│       │   │   └── useToc.ts
│       │   └── styles/
│       │       └── index.module.css
│       ├── package.json
│       └── tsconfig.json
├── package.json                   # monorepo root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

**包依赖关系**：

```
@luhanxin/md-parser-core
         ↓
   ┌─────┴─────┐
   ↓           ↓
md-parser-react  md-parser-vue
```

- `core` 包含所有解析逻辑、类型定义、Worker 架构
- `react` 和 `vue` 包只包含渲染组件，依赖 `core`

### Decision 2: WASM Worker 架构

**为什么需要 Worker**：

| 任务 | 耗时（1w 字文档） | 是否阻塞主线程 |
|------|------------------|---------------|
| AST 解析 | 50-100ms | ✅ 阻塞 |
| Shiki 高亮（10 个代码块） | 100-200ms | ✅ 阻塞（WASM） |
| Mermaid 渲染（复杂流程图） | 500-2000ms | ✅ 阻塞 |

将耗时任务移入 Web Worker：

```
┌─────────────────────────────────────────────────────────────┐
│                     主线程                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React/Vue 组件                                        │ │
│  │  ├─ 渲染 UI                                            │ │
│  │  ├─ 发送解析请求到 Worker                              │ │
│  │  └─ 接收解析结果，更新状态                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ postMessage
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Web Worker                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  md-parser-worker                                      │ │
│  │  ├─ 大文档 AST 解析（unified）                         │ │
│  │  ├─ Shiki 代码高亮（WASM）                             │ │
│  │  ├─ Mermaid 图表渲染（WASM）                           │ │
│  │  └─ 返回处理后的 HTML/AST                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Worker API 设计**：

```typescript
// packages/core/src/worker/index.ts
export interface WorkerRequest {
  id: string;
  type: 'parse' | 'highlight' | 'mermaid';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  type: 'parse' | 'highlight' | 'mermaid';
  result: any;
  error?: string;
}

// 主线程调用
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.postMessage({
  id: 'parse-1',
  type: 'parse',
  payload: { markdown: '...', options: { ... } }
});

worker.onmessage = (e) => {
  const { id, result, error } = e.data;
  // 处理结果
};
```

**Worker 任务分配**：

| 任务 | 执行位置 | 触发条件 |
|------|---------|---------|
| **大文档解析** | Worker | 文档 > 5000 字 |
| **Shiki 高亮** | Worker | 代码块 > 5 个 |
| **Mermaid 渲染** | Worker | 始终在 Worker |
| **小文档解析** | 主线程 | 文档 ≤ 5000 字 |

### Decision 3: 解析器技术选型

**选择 unified 生态**（而非 marked/micromark/自研）。

| 方案 | 优势 | 劣势 |
|------|------|------|
| **unified (remark + rehype)** | 生态丰富、插件系统成熟、AST 标准化、前后端通用 | 包体积较大（~200KB）、学习曲线 |
| marked | 轻量快速、无 AST | 插件少、无标准 AST、扩展困难 |
| micromark | GFM 兼容性最好 | 底层 API，需大量封装 |
| 自研 | 完全可控 | 开发成本极高 |

选择 unified 的核心理由：
1. **插件生态**：shiki、rehype-katex、rehype-sanitize、remark-math 等均有成熟的 unified 插件
2. **AST 标准化**：mdast（Markdown AST）和 hast（HTML AST）是业界标准，前后端可共用
3. **可扩展性**：自定义语法通过 remark 插件实现，与 unified 生态无缝集成

### Decision 4: 核心类型定义

```typescript
// packages/core/src/types/toc.ts
export interface TocItem {
  /** 标题文本 */
  text: string;
  /** 锚点 ID（用于页内跳转） */
  id: string;
  /** 标题层级（1-6） */
  level: number;
  /** 子级目录 */
  children?: TocItem[];
}

// packages/core/src/types/meta.ts
export interface ArticleMeta {
  /** 文章标题（从 frontmatter 或第一个 h1） */
  title?: string;
  /** 文章描述/摘要 */
  description?: string;
  /** 标签列表 */
  tags?: string[];
  /** 发布日期 */
  date?: string;
  /** 阅读时间估算（秒） */
  readingTime?: number;
  /** 字数统计 */
  wordCount?: number;
}

// packages/core/src/types/ast.ts — 扩展 mdast 节点类型
export interface MentionNode {
  type: 'mention';
  username: string;
}

export interface HashtagNode {
  type: 'hashtag';
  tag: string;
}

export interface ContainerNode {
  type: 'container';
  kind: 'tip' | 'warning' | 'info' | 'danger';
  children: any[];
}

// packages/core/src/types/worker.ts
export interface ParseResult {
  html: string;
  toc: TocItem[];
  meta: ArticleMeta;
  plainText: string;
}
```

### Decision 5: 自定义语法设计

#### @用户提及

```markdown
你好 @luhanxin，请查看这篇文章。
```

解析为 `<Mention>` React/Vue 组件或 `<a href="/user/luhanxin" class="mention">@luhanxin</a>`。

#### #标签/引用

```markdown
这篇文章讨论了 #Rust 和 #WebAssembly。
```

解析为 `<a href="/search?q=Rust" class="hashtag">#Rust</a>`。

#### ::: 容器语法

```markdown
:::tip
这是一个提示信息。
:::

:::warning
这是一个警告信息。
:::

:::info
这是一个信息说明。
:::

:::danger
这是一个危险操作警告。
:::
```

解析为带有样式类名的 `<div class="custom-container tip">...</div>`。

### Decision 6: 代码高亮方案

**选择 shiki**（而非 Prism/highlight.js）。

| 方案 | 特点 | 体积 |
|------|------|------|
| **shiki** | VS Code 同款引擎，WASM，主题丰富，语法精准 | ~500KB（含 WASM） |
| Prism | 纯 JS，主题通过 CSS | ~200KB |
| highlight.js | 纯 JS，自动检测语言 | ~200KB |

选择 shiki 的理由：
1. **语法精准度最高** — 使用 TextMate 语法，与 VS Code 一致
2. **主题系统** — 内置 dark/light 主题切换
3. **WASM 执行** — 可移入 Worker，不阻塞主线程
4. **按需加载语言** — 可配置只加载需要的语言

```typescript
// 代码高亮配置示例
import { codeToHtml } from 'shiki';

async function highlightCode(code: string, lang: string) {
  return codeToHtml(code, {
    lang,
    themes: {
      dark: 'github-dark',
      light: 'github-light',
    },
  });
}
```

### Decision 7: XSS 防护策略

使用 `rehype-sanitize`，自定义 schema 允许 shiki 生成的 HTML（含大量 span class）。

```typescript
import { defaultSchema } from 'rehype-sanitize';

// 自定义 sanitize schema — 允许 shiki 高亮 + mermaid + katex
const customSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // 允许 shiki 的 data 属性
    'span': [
      ...(defaultSchema.attributes?.span || []),
      ['className', /^shiki/, /^line/],
      ['style', /^--shiki-/],
    ],
    // 允许 mermaid/svg
    'svg': ['viewBox', 'xmlns', 'width', 'height', 'class'],
    'path': ['d', 'class', 'stroke'],
    // 允许 katex
    'span': [
      ...(defaultSchema.attributes?.span || []),
      ['class', 'katex', 'math-inline', 'math-display'],
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg', 'path', 'g', 'rect', 'circle', 'text',  // mermaid/svg
    'mjx-container',  // katex
  ],
};
```

### Decision 8: React 组件设计

```tsx
// packages/react/src/MarkdownRenderer.tsx
import { useMarkdown } from './hooks/useMarkdown';
import { CodeBlock } from './components/CodeBlock';
import { MermaidDiagram } from './components/MermaidDiagram';
import { MathFormula } from './components/MathFormula';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  onTocReady?: (toc: TocItem[]) => void;
}

export function MarkdownRenderer({ content, className, onTocReady }: MarkdownRendererProps) {
  const { html, toc, loading, error } = useMarkdown(content);

  React.useEffect(() => {
    if (toc && onTocReady) {
      onTocReady(toc);
    }
  }, [toc, onTocReady]);

  if (loading) return <div className="markdown-skeleton" />;
  if (error) return <div className="markdown-error">{error}</div>;

  return (
    <div
      className={`markdown-body ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

```tsx
// packages/react/src/hooks/useMarkdown.ts
import { useState, useEffect } from 'react';
import { parseMarkdown, type ParseResult } from '@luhanxin/md-parser-core';

export function useMarkdown(content: string) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    parseMarkdown(content)
      .then(setResult)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [content]);

  return {
    html: result?.html || '',
    toc: result?.toc || [],
    meta: result?.meta,
    plainText: result?.plainText || '',
    loading,
    error,
  };
}
```

### Decision 9: Vue 组件设计

```vue
<!-- packages/vue/src/MarkdownRenderer.vue -->
<template>
  <div v-if="loading" class="markdown-skeleton" />
  <div v-else-if="error" class="markdown-error">{{ error }}</div>
  <div
    v-else
    class="markdown-body"
    :class="className"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { parseMarkdown, type ParseResult } from '@luhanxin/md-parser-core';

const props = defineProps<{
  content: string;
  className?: string;
}>();

const emit = defineEmits<{
  (e: 'toc-ready', toc: TocItem[]): void;
}>();

const html = ref('');
const toc = ref<TocItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const parse = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result: ParseResult = await parseMarkdown(props.content);
    html.value = result.html;
    toc.value = result.toc;
    emit('toc-ready', result.toc);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(parse);
watch(() => props.content, parse);
</script>
```

### Decision 10: 后端 Rust 解析方案

本次仅设计接口，不实施。后续 `article-storage-optimization` change 中选择：

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **pulldown-cmark** | 快速、零依赖、Rust 原生 | 生态弱、无插件 | 后端仅需基础 MD→HTML + TOC |
| **WASM 调用 md-parser** | 前后端完全统一 | 跨语言开销 | 需要完全一致的 AST |

建议后端使用 `pulldown-cmark`（轻量快速），仅做 MD→HTML 和 TOC 提取。复杂的自定义语法渲染由前端负责。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **包体积大** | unified + shiki + mermaid + katex 总计 ~1.5MB | Tree-shaking + 按需加载（Mermaid/KaTeX 延迟加载）+ Code Splitting |
| **Worker 通信开销** | 序列化/反序列化 AST 有开销 | 仅在文档 > 5000 字时启用 Worker；小文档主线程解析 |
| **XSS 漏洞** | 自定义 sanitize schema 可能遗漏危险属性 | 编写 XSS 测试用例、定期审计 schema |
| **shiki WASM 加载** | 首次加载需下载 WASM 文件 | 预加载 + 缓存 + fallback 到无高亮 |
| **双框架维护成本** | React 和 Vue 组件需保持功能一致 | 共享核心逻辑（core 包）；组件仅做渲染；编写统一的集成测试 |

## Migration Plan

### 实施顺序

1. **Phase 1: core 包核心解析** — parse.ts + render.ts + 基础 GFM 插件
2. **Phase 2: Worker 架构** — 实现 Web Worker + 大文档解析 + Mermaid 渲染移入 Worker
3. **Phase 3: 代码高亮** — shiki 集成 + 主题系统 + 移入 Worker
4. **Phase 4: 自定义语法** — mention/hashtag/container 插件
5. **Phase 5: 图表和公式** — mermaid + katex 集成（Worker 中执行）
6. **Phase 6: 提取能力** — TOC/纯文本/元数据提取
7. **Phase 7: XSS 防护** — sanitize schema + 安全测试
8. **Phase 8: React 渲染组件** — MarkdownRenderer + Hooks
9. **Phase 9: Vue 渲染组件** — MarkdownRenderer + Composables
10. **Phase 10: 集成与迁移** — 替换主站和管理后台的渲染组件

## Open Questions（已解决）

1. **是否需要支持脚注语法？**
   - ✅ 选择：**支持**
   - 理由：学术文章常见需求，复用性高，社区广泛支持
   - 实现：pulldown-cmark 原生支持

2. **shiki 的语言列表是否全量加载？**
   - ✅ 选择：**按需加载常用语言 + 动态加载其他语言**
   - 理由：性能优化，减少初始包体积
   - 常用语言：JS/TS/Rust/Go/Python/Java/C++（内置）
   - 其他语言：动态 import（如 `shiki/languages/kotlin`）

3. **mermaid 渲染失败时的 fallback 策略？**
   - ✅ 选择：**显示错误提示 + 源代码块**
   - 理由：用户友好，可调试，便于反馈问题

4. **是否需要支持 emoji shortcodes？**
   - ✅ 选择：**支持**
   - 理由：社区常见需求，复用性高，提升用户体验
   - 实现：使用 `emoji-toolkit` 或 `node-emoji` 库

5. **后端 Rust 解析方案最终选择？**
   - ✅ 选择：**pulldown-cmark**
   - 理由：原生 Rust，性能好，维护性高，无需 WASM 开销
   - WASM 方案作为备选（如需前端完全一致的解析逻辑）

6. **Worker 是否需要支持 Service Worker？**
   - ✅ 选择：**支持**
   - 理由：离线缓存解析结果，性能优化，用户体验好
   - 实现：优先使用 Web Worker，可选升级为 Service Worker
