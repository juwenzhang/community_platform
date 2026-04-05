import { describe, expect, it } from 'vitest';
import { parseMarkdownToAst, renderMarkdown } from '../core';
import { extractMeta } from '../core/extract-meta';
import { countWords, estimateReadingTime, extractPlainText } from '../core/extract-text';
import { extractToc } from '../core/extract-toc';

describe('Markdown Parser Core', () => {
  describe('parseMarkdownToAst', () => {
    it('should parse basic markdown to AST', async () => {
      const markdown = '# Hello World\n\nThis is a paragraph.';
      const ast = await parseMarkdownToAst(markdown);

      expect(ast.type).toBe('root');
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[1].type).toBe('paragraph');
    });

    it('should parse GFM features', async () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
      const ast = await parseMarkdownToAst(markdown);

      const table = ast.children.find((node) => node.type === 'table');
      expect(table).toBeDefined();
    });

    it('should parse frontmatter', async () => {
      const markdown = `---
title: Test Article
date: 2026-04-05
---

# Content`;
      const ast = await parseMarkdownToAst(markdown);

      const yaml = ast.children.find((node) => node.type === 'yaml');
      expect(yaml).toBeDefined();
    });
  });

  describe('renderMarkdown', () => {
    it('should render basic markdown to HTML', async () => {
      const markdown = '# Hello World\n\nThis is **bold** text.';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('<h1');
      expect(html).toContain('Hello World');
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should render code blocks with syntax highlighting', async () => {
      const markdown = '```js\nconst x = 1;\n```';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('<pre');
      expect(html).toContain('const');
    });

    it('should render GFM tables', async () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('<table>');
      expect(html).toContain('<th>');
      expect(html).toContain('<td>');
    });
  });

  describe('extractToc', () => {
    it('should extract table of contents', async () => {
      const markdown = `# Title

## Section 1

### Subsection 1.1

## Section 2
`;
      const ast = await parseMarkdownToAst(markdown);
      const toc = extractToc(ast);

      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('Title');
      expect(toc[0].level).toBe(1);
      expect(toc[0].children).toHaveLength(2);
      expect(toc[0].children?.[0].text).toBe('Section 1');
      expect(toc[0].children?.[0].children).toHaveLength(1);
      expect(toc[0].children?.[0].children?.[0].text).toBe('Subsection 1.1');
    });

    it('should generate heading IDs', async () => {
      const markdown = '## Hello World\n## Another Title';
      const ast = await parseMarkdownToAst(markdown);
      const toc = extractToc(ast);

      expect(toc[0].id).toBe('hello-world');
      expect(toc[1].id).toBe('another-title');
    });

    it('should handle Chinese headings', async () => {
      const markdown = '## 中文标题';
      const ast = await parseMarkdownToAst(markdown);
      const toc = extractToc(ast);

      expect(toc[0].text).toBe('中文标题');
      expect(toc[0].id).toContain('中文标题');
    });
  });

  describe('extractPlainText', () => {
    it('should extract plain text from markdown', async () => {
      const markdown = '# Title\n\nThis is **bold** text.';
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);

      expect(plainText).toContain('Title');
      expect(plainText).toContain('bold');
      expect(plainText).not.toContain('**');
    });

    it('should skip code blocks by default', async () => {
      const markdown = 'Hello\n\n```js\nconst x = 1;\n```\n\nWorld';
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);

      expect(plainText).toContain('Hello');
      expect(plainText).toContain('World');
      expect(plainText).not.toContain('const x = 1');
    });
  });

  describe('countWords', () => {
    it('should count English words', () => {
      const text = 'Hello world this is a test';
      const count = countWords(text);

      expect(count).toBe(6);
    });

    it('should count Chinese characters', () => {
      const text = '这是中文测试';
      const count = countWords(text);

      expect(count).toBe(6);
    });

    it('should count mixed Chinese and English', () => {
      const text = 'Hello 世界 this is 测试';
      const count = countWords(text);

      // 英文单词：Hello, this, is (3个)
      // 中文字符：世界, 测试 (4个字符)
      // 总共：3 + 4 = 7
      expect(count).toBe(7);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time in minutes', () => {
      const text = 'word '.repeat(400); // 400 words
      const time = estimateReadingTime(text, 200);

      expect(time).toBe(2); // 400 / 200 = 2 minutes
    });

    it('should round up to at least 1 minute', () => {
      const text = 'short text';
      const time = estimateReadingTime(text, 200);

      expect(time).toBe(1);
    });
  });

  describe('extractMeta', () => {
    it('should extract frontmatter metadata', async () => {
      const markdown = `---
title: My Article
description: This is a test
tags:
  - test
  - markdown
---

# Content`;
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);
      const meta = extractMeta(ast, plainText);

      expect(meta.title).toBe('My Article');
      expect(meta.description).toBe('This is a test');
      expect(meta.tags).toEqual(['test', 'markdown']);
    });

    it('should extract title from h1 if not in frontmatter', async () => {
      const markdown = '# Article Title\n\nContent here.';
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);
      const meta = extractMeta(ast, plainText);

      expect(meta.title).toBe('Article Title');
    });

    it('should count words and estimate reading time', async () => {
      const markdown = '# Title\n\n' + 'word '.repeat(300);
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);
      const meta = extractMeta(ast, plainText);

      expect(meta.wordCount).toBeGreaterThan(0);
      expect(meta.readingTime).toBeGreaterThan(0);
    });
  });
});
