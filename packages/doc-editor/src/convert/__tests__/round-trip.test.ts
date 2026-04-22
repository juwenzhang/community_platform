/**
 * Markdown ↔ JSON 双向转换的 round-trip 等价性测试
 *
 * 核心约束：对于支持的 Markdown 语法子集，
 *   jsonToMarkdown(markdownToJson(md)) === normalize(md)
 *
 * 「等价」的定义是语义等价，不要求字符级完全一致（允许规范化：
 *   连续空行折叠、列表标记统一、尾部空白清理）
 */

import { describe, expect, it } from 'vitest';
import type { ProseMirrorJSON } from '../../types/editor';
import { jsonToMarkdown } from '../jsonToMarkdown';
import { markdownToJson } from '../markdownToJson';

/**
 * 规范化 Markdown 用于比较：
 * - 折叠 3+ 连续换行为 2 个
 * - 清理行尾空白
 * - 统一列表标记（* 和 + 都转为 -）
 * - 统一有序列表数字（1. 2. 3. 形式保留原始，允许 round-trip 后的重新编号）
 * - 清理首尾空白
 */
function _normalize(md: string): string {
  return md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[*+] /gm, '- ')
    .replace(/^(\s*)[*+] /gm, '$1- ')
    .trim();
}

async function roundTrip(md: string): Promise<string> {
  const json = await markdownToJson(md);
  return jsonToMarkdown(json);
}

describe('round-trip: basic blocks', () => {
  it('empty string', async () => {
    const result = await roundTrip('');
    expect(result).toBe('');
  });

  it('single paragraph', async () => {
    const md = 'Hello world.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('multiple paragraphs', async () => {
    const md = 'First paragraph.\n\nSecond paragraph.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('headings h1-h6', async () => {
    const md = '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('thematic break', async () => {
    const md = 'Before.\n\n---\n\nAfter.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('blockquote', async () => {
    const md = '> This is a quote.\n> Second line.';
    const result = await roundTrip(md);
    // mdast 会把连续的 > 行合并为同一个 blockquote 内的 paragraph（softBreak 分隔）
    // 序列化回来可能是单行（两句合并），等价性通过再次解析验证
    const json1 = await markdownToJson(md);
    const json2 = await markdownToJson(result);
    expect(json1).toEqual(json2);
  });

  it('fenced code block with language', async () => {
    const md = '```rust\nfn main() {\n    println!("Hello");\n}\n```';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('fenced code block without language', async () => {
    const md = '```\nplain text\n```';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });
});

describe('round-trip: inline marks', () => {
  it('bold', async () => {
    const md = 'This is **bold** text.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('italic', async () => {
    const md = 'This is *italic* text.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('inline code', async () => {
    const md = 'Use `const x = 1` to declare.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('strikethrough (GFM)', async () => {
    const md = 'This is ~~deleted~~ text.';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('link without title', async () => {
    const md = 'Check [Luhanxin](https://example.com).';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('nested bold + italic', async () => {
    const md = 'This is ***bold italic***.';
    // mdast 把 *** 解析为 strong > emphasis，序列化为 ***...***（正确）
    const json1 = await markdownToJson(md);
    const result = await roundTrip(md);
    const json2 = await markdownToJson(result);
    expect(json1).toEqual(json2);
  });
});

describe('round-trip: lists', () => {
  it('bullet list', async () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('ordered list', async () => {
    const md = '1. First\n2. Second\n3. Third';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('task list (GFM)', async () => {
    const md = '- [ ] Todo\n- [x] Done';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('nested bullet list', async () => {
    const md = '- Parent\n  - Child 1\n  - Child 2';
    const json1 = await markdownToJson(md);
    const result = await roundTrip(md);
    const json2 = await markdownToJson(result);
    expect(json1).toEqual(json2);
  });
});

describe('round-trip: images', () => {
  it('image without title', async () => {
    const md = '![alt text](https://example.com/image.jpg)';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('image inside paragraph', async () => {
    const md = 'Here is an image: ![alt](https://example.com/pic.png)';
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });
});

describe('round-trip: tables (GFM)', () => {
  it('simple table', async () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
    const json1 = await markdownToJson(md);
    const result = await roundTrip(md);
    const json2 = await markdownToJson(result);
    // 表格的具体格式（空格对齐等）可能有差异，比较 AST 语义等价
    expect(json1).toEqual(json2);
  });
});

describe('round-trip: Phase 2 extended blocks', () => {
  it('mermaid code block becomes mermaid node', async () => {
    const md = '```mermaid\ngraph TD\nA-->B\n```';
    const json = await markdownToJson(md);
    expect(json.content?.[0]).toEqual({
      type: 'mermaid',
      attrs: { code: 'graph TD\nA-->B' },
    });
    const result = await roundTrip(md);
    expect(result).toBe(md);
  });

  it('block math round-trip', async () => {
    const md = '$$\nE = mc^2\n$$';
    const json = await markdownToJson(md);
    expect(json.content?.[0]?.type).toBe('blockMath');
    const result = await roundTrip(md);
    // 再次解析等价即可（格式可能微调）
    const j2 = await markdownToJson(result);
    expect(j2).toEqual(json);
  });

  it('inline math in paragraph', async () => {
    const md = 'The formula $a^2 + b^2 = c^2$ is famous.';
    const json = await markdownToJson(md);
    const para = json.content?.[0];
    expect(para?.type).toBe('paragraph');
    const children = para?.content ?? [];
    const mathChild = children.find((c) => c.type === 'inlineMath');
    expect(mathChild).toBeDefined();
    expect(mathChild?.attrs?.formula).toBe('a^2 + b^2 = c^2');
  });

  // Container 节点：md-parser-core 的 remark-container 需要 sourceContainers 参数
  // 简化版：直接构造 PM JSON 验证反向序列化
  it('container JSON → Markdown', () => {
    const json: ProseMirrorJSON = {
      type: 'doc',
      content: [
        {
          type: 'container',
          attrs: { type: 'tip', title: '提示' },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '这是 tip 内容' }],
            },
          ],
        },
      ],
    };
    const md = jsonToMarkdown(json);
    expect(md).toBe(':::tip 提示\n这是 tip 内容\n:::');
  });
});

describe('round-trip: composite documents', () => {
  it('typical article', async () => {
    const md = `# Article Title

This is the introduction paragraph with **bold** and *italic* text.

## Section 1

Some content with a [link](https://example.com) inline.

- Point 1
- Point 2
- Point 3

### Subsection

\`\`\`typescript
const hello = 'world';
console.log(hello);
\`\`\`

> A wise quote.

---

## Section 2

1. First
2. Second
3. Third`;

    const json1 = await markdownToJson(md);
    const result = await roundTrip(md);
    const json2 = await markdownToJson(result);
    expect(json1).toEqual(json2);
  });
});

describe('markdownToJson: basic structure', () => {
  it('wraps empty input as doc with empty paragraph', async () => {
    const json = await markdownToJson('');
    expect(json.type).toBe('doc');
    expect(json.content).toHaveLength(1);
    expect(json.content?.[0].type).toBe('paragraph');
  });

  it('heading has correct level attr', async () => {
    const json = await markdownToJson('## Hello');
    expect(json.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Hello' }],
    });
  });

  it('bold text has bold mark', async () => {
    const json = await markdownToJson('**bold**');
    const para = json.content?.[0];
    expect(para?.type).toBe('paragraph');
    const text = para?.content?.[0];
    expect(text?.text).toBe('bold');
    expect(text?.marks).toEqual([{ type: 'bold' }]);
  });

  it('task list has checked attr', async () => {
    const json = await markdownToJson('- [x] Done');
    const list = json.content?.[0];
    expect(list?.type).toBe('taskList');
    const item = list?.content?.[0];
    expect(item?.type).toBe('taskItem');
    expect(item?.attrs?.checked).toBe(true);
  });
});
