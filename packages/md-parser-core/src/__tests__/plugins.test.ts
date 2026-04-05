import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../core';

describe('Custom Plugins', () => {
  describe('@mention plugin', () => {
    it('should render mentions as links with correct class', async () => {
      const markdown = 'Thanks @alice for the help!';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('href="/user/alice"');
      expect(result.html).toContain('@alice');
      // 验证使用正确的 class 而非 className
      expect(result.html).not.toContain('className');
    });

    it('should not match email addresses', async () => {
      const markdown = 'Contact me at test@example.com';
      const result = await renderMarkdown(markdown);

      expect(result.html).not.toContain('/user/example');
    });

    it('should support Chinese usernames', async () => {
      const markdown = '你好 @张三，请查看这篇文章。';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('/user/张三');
      expect(result.html).toContain('@张三');
    });
  });

  describe('#hashtag plugin', () => {
    it('should render hashtags as links with correct class', async () => {
      const markdown = 'Tags: #frontend #backend';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('/search?q=frontend');
      expect(result.html).toContain('/search?q=backend');
      expect(result.html).toContain('#frontend');
      // 验证使用正确的 class 而非 className
      expect(result.html).not.toContain('className="hashtag"');
    });

    it('should not conflict with markdown headers', async () => {
      const markdown = `# Title\n\nThis is #hashtag`;
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('<h1');
      expect(result.html).toContain('/search?q=hashtag');
    });

    it('should support Chinese tags', async () => {
      const markdown = '标签：#前端 #后端';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('前端');
      expect(result.html).toContain('后端');
    });
  });

  describe(':::container plugin', () => {
    it('should parse tip containers', async () => {
      const markdown = ':::tip\nThis is a tip.\n:::';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('custom-container');
      expect(result.html).toContain('tip');
      expect(result.html).toContain('This is a tip');
    });

    it('should parse warning containers with custom title', async () => {
      const markdown = ':::warning Attention\nThis is a warning.\n:::';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('warning');
      expect(result.html).toContain('Attention');
    });

    it('should parse info containers', async () => {
      const markdown = ':::info\nThis is information.\n:::';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('info');
    });

    it('should parse danger containers', async () => {
      const markdown = ':::danger\nThis is dangerous!\n:::';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('danger');
    });
  });
});
