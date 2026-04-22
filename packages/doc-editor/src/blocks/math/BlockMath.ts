/**
 * 块级数学公式 — `$$formula$$`
 *
 * schema：block atom node
 */

import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMath: {
      setBlockMath: (attrs: { formula: string }) => ReturnType;
      updateBlockMath: (formula: string) => ReturnType;
    };
  }
}

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  draggable: true,
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
    return [{ tag: 'div[data-type="block-math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'block-math',
        class: 'block-math',
      }),
    ];
  },

  addCommands() {
    return {
      setBlockMath:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { formula: attrs.formula },
          }),
      updateBlockMath:
        (formula) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { formula }),
    };
  },
});
