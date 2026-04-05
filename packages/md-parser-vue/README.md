# @luhanxin/md-parser-vue

> Vue 3 components for Markdown rendering with unified ecosystem

## Features

- ✅ **Vue 3 Composition API** - `<script setup>` + TypeScript
- ✅ **Automatic XSS Protection** - rehype-sanitize + mermaid securityLevel:strict
- ✅ **Lazy Loading** - Mermaid/KaTeX loaded on demand
- ✅ **Custom Components** - CodeBlock, MermaidDiagram, CustomContainer, Mention, Hashtag

## Installation

```bash
pnpm add @luhanxin/md-parser-vue @luhanxin/md-parser-core
```

**Peer Dependencies:**
```bash
pnpm add vue mermaid
```

## Quick Start

```vue
<template>
  <MarkdownRenderer
    :content="markdown"
    @toc-ready="handleTocReady"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRenderer } from '@luhanxin/md-parser-vue';
import '@luhanxin/md-parser-vue/styles.css';

const markdown = ref('# Hello World\n\nThis is **Markdown**.');

const handleTocReady = (toc) => {
  console.log('TOC:', toc);
};
</script>
```

## Components

### `<MarkdownRenderer />`

Main rendering component.

**Props:**
```ts
interface Props {
  /** Markdown content */
  content: string;
  /** Custom className */
  className?: string;
}
```

**Events:**
```ts
interface Emits {
  /** TOC extraction event */
  (e: 'toc-ready', toc: TocItem[]): void;
  /** Metadata extraction event */
  (e: 'meta-ready', meta: ArticleMeta): void;
}
```

### `useMarkdown()`

Composable for Markdown parsing.

```vue
<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else v-html="html"></div>
</template>

<script setup lang="ts">
import { useMarkdown } from '@luhanxin/md-parser-vue';

const markdown = '# Hello World';
const { html, toc, meta, loading, error } = useMarkdown(markdown);
</script>
```

### `<CodeBlock />`

Code block component with syntax highlighting.

```vue
<template>
  <CodeBlock
    :code="code"
    language="javascript"
    :show-line-numbers="true"
    :highlighted-html="shikiHtml"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CodeBlock from '@luhanxin/md-parser-vue/components/CodeBlock.vue';

const code = ref("console.log('Hello');");
</script>
```

### `<MermaidDiagram />`

Mermaid diagram component with lazy loading.

```vue
<template>
  <MermaidDiagram :code="mermaidCode" />
</template>

<script setup lang="ts">
import MermaidDiagram from '@luhanxin/md-parser-vue/components/MermaidDiagram.vue';

const mermaidCode = `graph TD
  A[Start] --> B[End]`;
</script>
```

### `<CustomContainer />`

Custom container component.

```vue
<template>
  <CustomContainer kind="tip" title="Pro Tip">
    Use TypeScript for better DX.
  </CustomContainer>
</template>

<script setup lang="ts">
import CustomContainer from '@luhanxin/md-parser-vue/components/CustomContainer.vue';
</script>
```

### `<Mention />`

@mention component.

```vue
<template>
  <Mention
    username="alice"
    @click="handleMentionClick"
  />
</template>

<script setup lang="ts">
import Mention from '@luhanxin/md-parser-vue/components/Mention.vue';

const handleMentionClick = (username: string) => {
  console.log(username);
};
</script>
```

### `<Hashtag />`

#hashtag component.

```vue
<template>
  <Hashtag
    tag="vue"
    @click="handleHashtagClick"
  />
</template>

<script setup lang="ts">
import Hashtag from '@luhanxin/md-parser-vue/components/Hashtag.vue';

const handleHashtagClick = (tag: string) => {
  console.log(tag);
};
</script>
```

## Styling

Import the default styles:

```vue
<script setup>
import '@luhanxin/md-parser-vue/styles.css';
</script>
```

Or use your own CSS by targeting:

- `.markdown-body` - Main container
- `.mention` - @mention links
- `.hashtag` - #hashtag links
- `.custom-container` - :::containers
- `.code-block-wrapper` - Code blocks
- `.mermaid-diagram` - Mermaid diagrams

## XSS Protection

The library uses **multi-layer sanitization**:

1. **Core pipeline**: `rehype-sanitize` filters dangerous HTML during Markdown processing
2. **Mermaid diagrams**: `securityLevel: 'strict'` prevents script injection in SVG output

This ensures maximum security against XSS attacks.

## License

MIT © luhanxin
