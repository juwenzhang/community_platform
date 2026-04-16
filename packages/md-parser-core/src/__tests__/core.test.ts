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

  describe('renderMarkdown (ParseResult)', () => {
    it('should return ParseResult with html, toc, meta, plainText, blocks', async () => {
      const markdown = '# Hello World\n\nThis is **bold** text.';
      const result = await renderMarkdown(markdown);

      // 验证 ParseResult 结构
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('toc');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('plainText');
      expect(result).toHaveProperty('blocks');

      // HTML
      expect(result.html).toContain('Hello World');
      expect(result.html).toContain('<strong>bold</strong>');

      // TOC
      expect(result.toc).toHaveLength(1);
      expect(result.toc[0].text).toBe('Hello World');
      expect(result.toc[0].level).toBe(1);

      // plainText
      expect(result.plainText).toContain('Hello World');
      expect(result.plainText).toContain('bold');

      // blocks
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should render code blocks with syntax highlighting', async () => {
      const markdown = '```js\nconst x = 1;\n```';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('<pre');
      expect(result.html).toContain('const');
    });

    it('should render GFM tables', async () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('<table>');
      expect(result.html).toContain('<th>');
      expect(result.html).toContain('<td>');
    });

    it('should extract frontmatter metadata in ParseResult', async () => {
      const markdown = `---
title: My Article
description: This is a test
tags:
  - test
  - markdown
---

# Content`;
      const result = await renderMarkdown(markdown);

      expect(result.meta.title).toBe('My Article');
      expect(result.meta.description).toBe('This is a test');
      expect(result.meta.tags).toEqual(['test', 'markdown']);
    });

    it('should inject heading IDs when postProcess is enabled', async () => {
      const markdown = '## Hello World';
      const result = await renderMarkdown(markdown, { postProcess: true });

      expect(result.html).toContain('id="hello-world"');
      expect(result.html).toContain('heading-anchor');
    });

    it('should add lazy loading to images', async () => {
      const markdown = '![alt1](img1.png)\n\n![alt2](img2.png)';
      const result = await renderMarkdown(markdown, { postProcess: true });

      // 第一张不 lazy（首屏 LCP），第二张 lazy
      const imgMatches = result.html.match(/<img[^>]*>/g) || [];
      expect(imgMatches.length).toBe(2);
      expect(imgMatches[0]).not.toContain('loading="lazy"');
      expect(imgMatches[1]).toContain('loading="lazy"');
    });
  });

  describe('extractToc (standalone)', () => {
    it('should extract table of contents', async () => {
      const markdown = `# Title\n\n## Section 1\n\n### Subsection 1.1\n\n## Section 2\n`;
      const ast = await parseMarkdownToAst(markdown);
      const toc = extractToc(ast);

      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('Title');
      expect(toc[0].children).toHaveLength(2);
    });

    it('should handle Chinese headings', async () => {
      const markdown = '## 中文标题';
      const ast = await parseMarkdownToAst(markdown);
      const toc = extractToc(ast);

      expect(toc[0].text).toBe('中文标题');
      expect(toc[0].id).toContain('中文标题');
    });
  });

  describe('extractPlainText (standalone)', () => {
    it('should extract plain text from markdown', async () => {
      const markdown = '# Title\n\nThis is **bold** text.';
      const ast = await parseMarkdownToAst(markdown);
      const plainText = extractPlainText(ast);

      expect(plainText).toContain('Title');
      expect(plainText).toContain('bold');
      expect(plainText).not.toContain('**');
    });

    it('should skip code blocks', async () => {
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
      expect(countWords('Hello world this is a test')).toBe(6);
    });

    it('should count Chinese characters', () => {
      expect(countWords('这是中文测试')).toBe(6);
    });

    it('should count mixed Chinese and English', () => {
      expect(countWords('Hello 世界 this is 测试')).toBe(7);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time in minutes', () => {
      const text = 'word '.repeat(400);
      expect(estimateReadingTime(text, 200)).toBe(2);
    });

    it('should round up to at least 1 minute', () => {
      expect(estimateReadingTime('short text', 200)).toBe(1);
    });
  });

  describe('extractMeta (standalone)', () => {
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
  });
});
