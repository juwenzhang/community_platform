# @luhanxin/md-parser-react

> React components for Markdown rendering with unified ecosystem

## Features

- ✅ **React 18+ Support** - Hooks + Functional Components
- ✅ **Automatic XSS Protection** - rehype-sanitize + DOMPurify
- ✅ **Image Upload** - Paste/drop image upload with validation
- ✅ **Watermark** - Add watermark to uploaded images
- ✅ **Custom Components** - CodeBlock, MermaidDiagram, CustomContainer, Mention, Hashtag

## Installation

```bash
pnpm add @luhanxin/md-parser-react @luhanxin/md-parser-core
```

**Peer Dependencies:**
```bash
pnpm add react react-dom mermaid
```

## Quick Start

```tsx
import { MarkdownRenderer } from '@luhanxin/md-parser-react';
import '@luhanxin/md-parser-react/styles.css';

function App() {
  const handleTocReady = (toc) => {
    console.log('TOC:', toc);
  };

  return (
    <MarkdownRenderer
      content="# Hello World\n\nThis is **Markdown**."
      onTocReady={handleTocReady}
    />
  );
}
```

## Components

### `<MarkdownRenderer />`

Main rendering component.

**Props:**
```tsx
interface MarkdownRendererProps {
  /** Markdown content */
  content: string;
  /** Custom className */
  className?: string;
  /** TOC extraction callback */
  onTocReady?: (toc: TocItem[]) => void;
  /** Metadata extraction callback */
  onMetaReady?: (meta: ArticleMeta) => void;
  /** Image upload handler */
  onImageUpload?: (file: File) => string | Promise<string>;
  /** Enable image paste (default: true) */
  enableImagePaste?: boolean;
  /** Image validation */
  validateImage?: (file: File) => boolean | string;
  /** Upload success callback */
  onImageUploaded?: (url: string, file: File) => void;
  /** Upload error callback */
  onImageUploadError?: (error: Error, file: File) => void;
  /** Watermark options */
  watermark?: {
    text?: string;
    opacity?: number;
    fontSize?: number;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  };
}
```

### `useMarkdown()`

Custom hook for Markdown parsing.

```tsx
import { useMarkdown } from '@luhanxin/md-parser-react';

function MyComponent() {
  const { html, toc, meta, loading, error } = useMarkdown(markdownContent);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### `<CodeBlock />`

Code block component with syntax highlighting.

```tsx
import { CodeBlock } from '@luhanxin/md-parser-react';

<CodeBlock
  code="console.log('Hello');"
  language="javascript"
  showLineNumbers
  highlightedHtml={shikiHtml}
/>
```

### `<MermaidDiagram />`

Mermaid diagram component with lazy loading.

```tsx
import { MermaidDiagram } from '@luhanxin/md-parser-react';

<MermaidDiagram
  code={`graph TD
    A[Start] --> B[End]`}
/>
```

### `<CustomContainer />`

Custom container component.

```tsx
import { CustomContainer } from '@luhanxin/md-parser-react';

<CustomContainer kind="tip" title="Pro Tip">
  Use TypeScript for better DX.
</CustomContainer>
```

### `<Mention />`

@mention component.

```tsx
import { Mention } from '@luhanxin/md-parser-react';

<Mention
  username="alice"
  onClick={(username) => console.log(username)}
/>
```

### `<Hashtag />`

#hashtag component.

```tsx
import { Hashtag } from '@luhanxin/md-parser-react';

<Hashtag
  tag="vue"
  onClick={(tag) => console.log(tag)}
/>
```

## Image Upload Example

```tsx
import { MarkdownRenderer } from '@luhanxin/md-parser-react';

function Editor() {
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const { url } = await response.json();
    return url;
  };

  return (
    <MarkdownRenderer
      content={markdown}
      onImageUpload={handleImageUpload}
      validateImage={(file) => {
        if (file.size > 5 * 1024 * 1024) {
          return 'Image must be < 5MB';
        }
        return true;
      }}
      onImageUploaded={(url) => {
        console.log('Uploaded:', url);
      }}
      watermark={{
        text: '© My Blog',
        position: 'bottom-right',
        opacity: 0.3,
      }}
    />
  );
}
```

## Styling

Import the default styles:

```tsx
import '@luhanxin/md-parser-react/styles.css';
```

Or use your own CSS by targeting:

- `.markdown-body` - Main container
- `.mention` - @mention links
- `.hashtag` - #hashtag links
- `.custom-container` - :::containers
- `.code-block-wrapper` - Code blocks
- `.mermaid-diagram` - Mermaid diagrams

## XSS Protection

The library uses **double sanitization**:

1. **Server-side** (core): `rehype-sanitize` filters dangerous HTML
2. **Client-side** (React): `DOMPurify` sanitizes again before rendering

This ensures maximum security even if malicious HTML bypasses the first layer.

## License

MIT © luhanxin
