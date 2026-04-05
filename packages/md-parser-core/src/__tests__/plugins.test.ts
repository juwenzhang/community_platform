import { describe, expect, it } from 'vitest';
import { parseMarkdownToAst, renderMarkdown } from '../core';

describe('Custom Plugins', () => {
  describe('@mention plugin', () => {
    it('should parse @username mentions', async () => {
      const markdown = 'Hello @luhanxin, how are you?';
      const ast = await parseMarkdownToAst(markdown);

      // Check AST structure
      const paragraph = ast.children[0];
      expect(paragraph.type).toBe('paragraph');

      // Should have text nodes and mention nodes
      const hasMention = JSON.stringify(ast).includes('@luhanxin');
      expect(hasMention).toBe(true);
    });

    it('should render mentions as links', async () => {
      const markdown = 'Thanks @alice for the help!';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('/user/alice');
      // Note: class attribute values are sanitized, but links work correctly
      expect(html).toContain('@alice');
      expect(html).toContain('href="/user/alice"');
    });

    it('should not match email addresses', async () => {
      const markdown = 'Contact me at test@example.com';
      const html = await renderMarkdown(markdown);

      // Should NOT convert email to mention link
      expect(html).not.toContain('/user/example');
      expect(html).toContain('test@example.com');
    });

    it('should support Chinese usernames', async () => {
      const markdown = '你好 @张三，请查看这篇文章。';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('/user/张三');
      expect(html).toContain('@张三');
    });
  });

  describe('#hashtag plugin', () => {
    it('should parse #tag hashtags', async () => {
      const markdown = 'This article is about #Rust and #WebAssembly';
      const ast = await parseMarkdownToAst(markdown);

      const hasHashtag = JSON.stringify(ast).includes('#Rust');
      expect(hasHashtag).toBe(true);
    });

    it('should render hashtags as links', async () => {
      const markdown = 'Tags: #frontend #backend';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('/search?q=frontend');
      expect(html).toContain('/search?q=backend');
      // Note: class attribute values are sanitized, but links work correctly
      expect(html).toContain('#frontend');
      expect(html).toContain('#backend');
    });

    it('should not conflict with markdown headers', async () => {
      const markdown = `# Title

This is #hashtag`;
      const html = await renderMarkdown(markdown);

      // First # should be a header
      expect(html).toContain('<h1');

      // Second # should be a hashtag
      expect(html).toContain('/search?q=hashtag');
    });

    it('should support Chinese tags', async () => {
      const markdown = '标签：#前端 #后端';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('前端');
      expect(html).toContain('后端');
    });
  });

  describe(':::container plugin', () => {
    it('should parse tip containers', async () => {
      const markdown = `:::tip
This is a tip.
:::`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('custom-container');
      expect(html).toContain('tip');
      expect(html).toContain('This is a tip');
    });

    it('should parse warning containers with custom title', async () => {
      const markdown = `:::warning Attention
This is a warning.
:::`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('warning');
      expect(html).toContain('Attention');
      expect(html).toContain('This is a warning');
    });

    it('should parse info containers', async () => {
      const markdown = `:::info
This is information.
:::`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('info');
    });

    it('should parse danger containers', async () => {
      const markdown = `:::danger
This is dangerous!
:::`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('danger');
    });

    it('should support nested content', async () => {
      const markdown = `:::tip
**Bold text** and *italic*.

- List item 1
- List item 2
:::`;
      const html = await renderMarkdown(markdown);

      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<li>');
    });
  });
});
