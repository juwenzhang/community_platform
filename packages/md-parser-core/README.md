# @luhanxin/md-parser-core

> Core Markdown parsing library with unified ecosystem

## Features

- ✅ **Full GFM Support** - GitHub Flavored Markdown (tables, task lists, strikethrough)
- ✅ **Code Highlighting** - Shiki with dual themes (light + dark)
- ✅ **Math Support** - KaTeX for mathematical formulas
- ✅ **Diagrams** - Mermaid flowcharts, sequence diagrams, etc.
- ✅ **Custom Syntax** - @mentions, #hashtags, :::containers
- ✅ **TOC Extraction** - Table of contents with anchor IDs
- ✅ **Metadata Extraction** - Frontmatter + word count + reading time
- ✅ **XSS Protection** - rehype-sanitize with custom schema

## Installation

```bash
pnpm add @luhanxin/md-parser-core
```

## Quick Start

```typescript
import { renderMarkdown, extractToc, extractMeta } from '@luhanxin/md-parser-core';

const markdown = `
---
title: Hello World
author: Alice
---

# Hello World

This is a @mention and #hashtag.

:::tip
This is a tip container.
:::
`;

// Render to HTML
const html = await renderMarkdown(markdown);
console.log(html);

// Extract TOC
const toc = extractToc(markdown);
console.log(toc);
// [{ id: 'hello-world', level: 1, text: 'Hello World', children: [] }]

// Extract metadata
const meta = extractMeta(markdown);
console.log(meta);
// { title: 'Hello World', author: 'Alice', wordCount: 7, readingTime: 1 }
```

## API

### `renderMarkdown(input: string, options?: RenderOptions): Promise<string>`

Render Markdown to sanitized HTML.

**Options:**
```typescript
interface RenderOptions {
  /** Enable Shiki code highlighting (default: true) */
  highlight?: boolean;
  /** Shiki theme for light mode (default: 'github-light') */
  themeLight?: string;
  /** Shiki theme for dark mode (default: 'github-dark') */
  themeDark?: string;
  /** Enable Mermaid diagrams (default: true) */
  mermaid?: boolean;
  /** Enable KaTeX math (default: true) */
  katex?: boolean;
}
```

### `extractToc(input: string): TocItem[]`

Extract table of contents from Markdown.

**Returns:**
```typescript
interface TocItem {
  id: string;        // Anchor ID (e.g., 'hello-world')
  level: number;     // Heading level (1-6)
  text: string;      // Heading text
  children: TocItem[];
}
```

### `extractMeta(input: string): ArticleMeta`

Extract metadata from frontmatter and content.

**Returns:**
```typescript
interface ArticleMeta {
  title?: string;       // From frontmatter or first h1
  author?: string;      // From frontmatter
  date?: string;        // From frontmatter
  tags?: string[];      // From frontmatter
  wordCount: number;    // Word count (Chinese + English)
  readingTime: number;  // Estimated reading time (minutes)
  [key: string]: any;   // Other frontmatter fields
}
```

### `extractText(input: string): string`

Extract plain text from Markdown (for search indexing).

## Custom Syntax

### @Mentions

```markdown
Hello @alice and @bob!
```

Renders as:
```html
<a href="/user/alice" class="mention" data-username="alice">@alice</a>
```

### #Hashtags

```markdown
This is about #javascript and #vue
```

Renders as:
```html
<a href="/tag/javascript" class="hashtag" data-tag="javascript">#javascript</a>
```

### :::Containers

```markdown
:::tip
This is a tip.
:::

:::warning Custom Title
This is a warning with custom title.
:::

:::info
Information message.
:::

:::danger
Danger zone!
:::
```

Renders as:
```html
<div class="custom-container tip">
  <p class="custom-container-title">TIP</p>
  <p>This is a tip.</p>
</div>
```

## XSS Protection

The library uses `rehype-sanitize` with a custom schema that:

- ✅ Allows Shiki highlighted HTML
- ✅ Allows Mermaid SVG
- ✅ Allows KaTeX elements
- ❌ Blocks `<script>` tags
- ❌ Blocks `onclick`, `onerror` attributes
- ❌ Blocks `javascript:` URLs
- ❌ Blocks `expression()` CSS

## Performance

- **Small bundle**: ~15 KB gzipped (core only)
- **Streaming**: Handles large documents efficiently
- **Lazy loading**: Mermaid/KaTeX loaded on demand

## Related Packages

- `@luhanxin/md-parser-react` - React components
- `@luhanxin/md-parser-vue` - Vue 3 components

## License

MIT © luhanxin
