import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../core';
import { containsDangerousContent, sanitizeHtml } from '../sanitize/schema';

describe('XSS Protection', () => {
  describe('containsDangerousContent', () => {
    it('should detect script tags', () => {
      const html = '<script>alert("XSS")</script>';
      expect(containsDangerousContent(html)).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Click</a>';
      expect(containsDangerousContent(html)).toBe(true);
    });

    it('should detect event handlers', () => {
      const html = '<img src="x" onerror="alert(\'XSS\')">';
      expect(containsDangerousContent(html)).toBe(true);
    });

    it('should detect iframe tags', () => {
      const html = '<iframe src="evil.com"></iframe>';
      expect(containsDangerousContent(html)).toBe(true);
    });

    it('should detect expression() in CSS', () => {
      const html = '<div style="width: expression(alert(\'XSS\'))">';
      expect(containsDangerousContent(html)).toBe(true);
    });

    it('should allow safe HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      expect(containsDangerousContent(html)).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<script');
      expect(sanitized).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('renderMarkdown XSS protection', () => {
    it('should sanitize script injection', async () => {
      const markdown = '<script>alert("XSS")</script>';
      const html = await renderMarkdown(markdown);

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert');
    });

    it('should sanitize onclick handlers', async () => {
      const markdown = '<img src="x" onerror="alert(\'XSS\')">';
      const html = await renderMarkdown(markdown);

      expect(html).not.toContain('onerror');
    });

    it('should sanitize javascript: URLs in links', async () => {
      const markdown = '[Click me](javascript:alert("XSS"))';
      const html = await renderMarkdown(markdown);

      expect(html).not.toContain('javascript:');
    });

    it('should allow safe markdown', async () => {
      const markdown = '# Title\n\n**Bold** and *italic* text.';
      const html = await renderMarkdown(markdown);

      expect(html).toContain('<h1');
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('should allow Shiki code highlighting elements', async () => {
      const markdown = '```js\nconst x = 1;\n```';
      const html = await renderMarkdown(markdown);

      // Should preserve Shiki's span elements with classes
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
    });

    it('should filter dangerous HTML in code blocks', async () => {
      const markdown = '```html\n<script>alert("XSS")</script>\n```';
      const html = await renderMarkdown(markdown);

      // Code blocks should escape HTML entities
      expect(html).not.toContain('<script>alert');
    });
  });
});
