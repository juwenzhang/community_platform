import { MarkdownRenderer } from '@luhanxin/md-parser-react';
import { useState } from 'react';

const sampleMarkdown = `# React Markdown Demo

这是一个 **测试示例**，验证 \`@luhanxin/md-parser-react\` 包是否正常工作。

## 功能测试

### 1. 代码高亮

\`\`\`typescript
import { MarkdownRenderer } from '@luhanxin/md-parser-react';

function App() {
  const markdown = '# Hello World';
  return <MarkdownRenderer markdown={markdown} />;
}
\`\`\`

### 2. Mermaid 图表

\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行]
    B -->|否| D[结束]
    C --> D
\`\`\`

### 3. Mention 提及

@luhanxin 你好，这是一条测试消息。

### 4. Hashtag 标签

#前端开发 #React #Markdown

### 5. 自定义容器

:::tip 提示
这是一个提示框
:::

:::warning 警告
这是一个警告框
:::

## 列表测试

- 无序列表项 1
- 无序列表项 2
  - 嵌套项 2.1
  - 嵌套项 2.2

1. 有序列表项 1
2. 有序列表项 2

---

**测试完成！** ✅
`;

export default function App() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>React Markdown Parser Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="markdown-input"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          编辑 Markdown：
        </label>
        <textarea
          id="markdown-input"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            fontSize: '14px',
            fontFamily: 'monospace',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ borderTop: '2px solid #eee', paddingTop: '20px' }}>
        <h2 style={{ marginBottom: '16px' }}>渲染结果：</h2>
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}
