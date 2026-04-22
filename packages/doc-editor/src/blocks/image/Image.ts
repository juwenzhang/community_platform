/**
 * 图片块扩展
 *
 * 基于 @tiptap/extension-image，扩展支持：
 * - alt 编辑
 * - align (left / center / right)
 * - width (resize)
 *
 * 上传 handler 通过 DocEditorProvider 或 DocEditor prop 注入，
 * 实现可用默认的 createCloudinaryUploadHandler 或消费方自定义。
 */

import TiptapImage from '@tiptap/extension-image';

export const Image = TiptapImage.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (el) => (el as HTMLElement).dataset.align || 'center',
        renderHTML: (attrs) => {
          if (!attrs.align || attrs.align === 'center') return {};
          return { 'data-align': attrs.align };
        },
      },
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.width || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { style: `width: ${attrs.width}` };
        },
      },
    };
  },
}).configure({
  HTMLAttributes: { class: 'editor-image' },
  inline: false,
  allowBase64: false, // 不允许 base64，避免污染 Markdown
});
