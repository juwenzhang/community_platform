import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../core';
import { customSanitizeSchema } from '../sanitize/schema';

describe('XSS Protection', () => {
  describe('customSanitizeSchema', () => {
    it('should have required tag names', () => {
      expect(customSanitizeSchema.tagNames).toContain('svg');
      expect(customSanitizeSchema.tagNames).toContain('button');
      expect(customSanitizeSchema.tagNames).toContain('mjx-container');
    });

    it('should allow img loading attribute', () => {
      const imgAttrs = customSanitizeSchema.attributes?.img;
      expect(imgAttrs).toContain('loading');
    });

    it('should allow a target attribute for external links', () => {
      const aAttrs = customSanitizeSchema.attributes?.a;
      expect(aAttrs).toContain('target');
      expect(aAttrs).toContain('rel');
    });
  });

  describe('renderMarkdown XSS protection', () => {
    it('should sanitize script injection', async () => {
      const markdown = '<script>alert("XSS")</script>';
      const result = await renderMarkdown(markdown);

      expect(result.html).not.toContain('<script');
      expect(result.html).not.toContain('alert');
    });

    it('should sanitize onclick handlers', async () => {
      const markdown = '<img src="x" onerror="alert(\'XSS\')">';
      const result = await renderMarkdown(markdown);

      expect(result.html).not.toContain('onerror');
    });

    it('should sanitize javascript: URLs in links', async () => {
      const markdown = '[Click me](javascript:alert("XSS"))';
      const result = await renderMarkdown(markdown);

      expect(result.html).not.toContain('javascript:');
    });

    it('should allow safe markdown', async () => {
      const markdown = '# Title\n\n**Bold** and *italic* text.';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('<strong>Bold</strong>');
      expect(result.html).toContain('<em>italic</em>');
    });

    it('should preserve Shiki code elements', async () => {
      const markdown = '```js\nconst x = 1;\n```';
      const result = await renderMarkdown(markdown);

      expect(result.html).toContain('<pre');
      expect(result.html).toContain('<code');
    });
  });
});
