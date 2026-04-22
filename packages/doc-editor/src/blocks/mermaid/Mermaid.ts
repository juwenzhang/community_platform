/**
 * Mermaid 图表块
 *
 * Markdown 表示：``` ```mermaid\n<code>\n``` ```
 * 与 md-parser-core 的 Mermaid 块对齐。
 *
 * 实现策略：
 * - 存储为独立 Node（atom block），避免嵌套编辑复杂度
 * - attrs.code 存储 Mermaid 源代码
 * - 实际 SVG 渲染由 NodeView 通过 dynamic import mermaid 完成
 *   （NodeView 在 React 集成层添加，本文件只定义 schema）
 */

import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /** 插入 Mermaid 图表 */
      setMermaid: (attrs: { code: string }) => ReturnType;
      /** 更新 Mermaid 源代码 */
      updateMermaidCode: (code: string) => ReturnType;
    };
  }
}

export const Mermaid = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).dataset.code ?? '',
        renderHTML: (attrs) => {
          if (!attrs.code) return {};
          return { 'data-code': attrs.code };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        class: 'mermaid-block',
      }),
    ];
  },

  addCommands() {
    return {
      setMermaid:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { code: attrs.code },
          }),
      updateMermaidCode:
        (code) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { code }),
    };
  },
});
