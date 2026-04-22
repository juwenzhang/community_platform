/**
 * Editor 工厂基础测试
 */

import { describe, expect, it } from 'vitest';
import { createEditor } from '../createEditor';

describe('createEditor', () => {
  it('creates an editor with empty content', async () => {
    const editor = await createEditor();
    expect(editor).toBeDefined();
    expect(editor.isEditable).toBe(true);
    editor.destroy();
  });

  it('creates with Markdown string content', async () => {
    const editor = await createEditor({ content: '# Hello\n\nWorld' });
    const html = editor.getHTML();
    expect(html).toContain('<h1>');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
    editor.destroy();
  });

  it('creates with ProseMirror JSON content', async () => {
    const editor = await createEditor({
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'JSON Title' }],
          },
        ],
      },
    });
    const html = editor.getHTML();
    expect(html).toContain('<h2>');
    expect(html).toContain('JSON Title');
    editor.destroy();
  });

  it('respects editable: false', async () => {
    const editor = await createEditor({ editable: false });
    expect(editor.isEditable).toBe(false);
    editor.destroy();
  });

  it('calls onCreate when provided', async () => {
    const called = await new Promise<boolean>((resolve) => {
      createEditor({
        onCreate: () => resolve(true),
      }).then((editor) => {
        // 兜底超时（TipTap 生命周期在同步 new Editor 后触发）
        setTimeout(() => {
          editor.destroy();
          resolve(false);
        }, 100);
      });
    });
    expect(called).toBe(true);
  });

  it('accepts extra extensions', async () => {
    // Phase 1 只测试默认能正常工作，extra 扩展留到对应 Phase
    const editor = await createEditor({ extensions: [] });
    expect(editor).toBeDefined();
    editor.destroy();
  });

  it('destroys cleanly without errors', async () => {
    const editor = await createEditor({ content: '# Test' });
    expect(() => editor.destroy()).not.toThrow();
    expect(editor.isDestroyed).toBe(true);
  });
});
