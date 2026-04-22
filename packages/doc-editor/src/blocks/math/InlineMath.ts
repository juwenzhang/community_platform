/**
 * 行内数学公式 — `$formula$`
 *
 * schema：inline atom node
 * attrs.formula 存储 LaTeX 源码
 * KaTeX 渲染由 NodeView 完成（dynamic import）
 */

import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineMath: {
      setInlineMath: (attrs: { formula: string }) => ReturnType;
      updateInlineMath: (formula: string) => ReturnType;
    };
  }
}

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      formula: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).dataset.formula ?? '',
        renderHTML: (attrs) => {
          if (!attrs.formula) return {};
          return { 'data-formula': attrs.formula };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'inline-math',
        class: 'inline-math',
      }),
    ];
  },

  addCommands() {
    return {
      setInlineMath:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { formula: attrs.formula },
          }),
      updateInlineMath:
        (formula) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { formula }),
    };
  },
});
