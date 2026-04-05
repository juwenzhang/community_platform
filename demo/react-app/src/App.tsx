import type { TocItem } from '@luhanxin/md-parser-core';
import {
  MarkdownErrorBoundary,
  MarkdownProvider,
  MarkdownRenderer,
  useActiveHeading,
} from '@luhanxin/md-parser-react';
import { useCallback, useRef, useState } from 'react';

const sampleMarkdown = `---
title: React Markdown Demo
tags: [react, markdown, enterprise]
---

# React Markdown Parser Demo

这是一个 **企业级** Markdown 渲染 Demo，验证 \`@luhanxin/md-parser-react\` 的全部能力。

## 功能测试

### 1. 代码高亮 (Shiki)

\`\`\`typescript
import { MarkdownRenderer } from '@luhanxin/md-parser-react';

function App() {
  return <MarkdownRenderer content={markdown} />;
}
\`\`\`

### 2. 自定义语法

@luhanxin 你好，这是一条 @mention 测试。

标签测试：#前端开发 #React #Markdown

### 3. 自定义容器

:::tip 提示
这是一个提示框，支持 **Markdown** 语法。
:::

:::warning 注意
这是一个警告框。
:::

:::danger 危险
请勿在生产环境使用未经测试的代码！
:::

### 4. 外链处理

访问 [GitHub](https://github.com) 查看源代码。

### 5. 表格

| 渲染级别 | 阈值 | 技术 |
|----------|------|------|
| DOM | < 5000 字 | innerHTML |
| 虚拟列表 | 5K-50K 字 | IntersectionObserver |
| Canvas | 50K-200K 字 | Canvas 2D |
| WebGL/GPU | > 200K 字 | SDF + instanced draw |

---

**测试完成！** ✅
`;

function TocSidebar({ toc, activeId }: { toc: TocItem[]; activeId: string | null }) {
  return (
    <nav style={{ position: 'sticky', top: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#515767' }}>目录</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              style={{
                display: 'block',
                padding: '4px 0',
                paddingLeft: (item.level - 1) * 16,
                fontSize: 13,
                color: activeId === item.id ? '#1e80ff' : '#8a919f',
                fontWeight: activeId === item.id ? 600 : 400,
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              {item.text}
            </a>
            {item.children?.map((child) => (
              <a
                key={child.id}
                href={`#${child.id}`}
                style={{
                  display: 'block',
                  padding: '3px 0',
                  paddingLeft: (child.level - 1) * 16,
                  fontSize: 12,
                  color: activeId === child.id ? '#1e80ff' : '#a8b1bf',
                  fontWeight: activeId === child.id ? 600 : 400,
                  textDecoration: 'none',
                }}
              >
                {child.text}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function App() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeId = useActiveHeading(containerRef, toc);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
  }, []);

  return (
    <MarkdownProvider
      eventHandlers={{
        onMentionClick: (u) => addEvent(`@mention: ${u}`),
        onHashtagClick: (t) => addEvent(`#hashtag: ${t}`),
        onImageClick: (src) => addEvent(`image: ${src}`),
        onLinkClick: (href) => addEvent(`link: ${href}`),
        onCodeCopy: (_, lang) => addEvent(`code copy: ${lang}`),
        onHeadingClick: (id) => addEvent(`heading: #${id}`),
      }}
    >
      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto', padding: 16, gap: 24 }}>
        {/* 左侧：编辑器 + 渲染 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
            React Markdown Parser Demo
          </h1>

          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{
              width: '100%',
              minHeight: 150,
              padding: 12,
              fontSize: 13,
              fontFamily: 'monospace',
              border: '1px solid #e4e6eb',
              borderRadius: 8,
              marginBottom: 16,
              resize: 'vertical',
            }}
          />

          <MarkdownErrorBoundary>
            <div ref={containerRef}>
              <MarkdownRenderer content={markdown} onTocReady={setToc} debounce={200} />
            </div>
          </MarkdownErrorBoundary>
        </div>

        {/* 右侧：TOC + 事件日志 */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <TocSidebar toc={toc} activeId={activeId} />

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#515767' }}>
              事件日志
            </h3>
            <div
              style={{
                maxHeight: 300,
                overflow: 'auto',
                fontSize: 12,
                fontFamily: 'monospace',
                background: '#f7f8fa',
                borderRadius: 8,
                padding: 8,
              }}
            >
              {events.length === 0 ? (
                <span style={{ color: '#a8b1bf' }}>点击 @mention、#hashtag 等试试</span>
              ) : (
                events.map((e, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: 事件日志列表，顺序固定
                  <div key={`${e}-${i}`} style={{ padding: '2px 0', color: '#515767' }}>
                    {e}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MarkdownProvider>
  );
}
