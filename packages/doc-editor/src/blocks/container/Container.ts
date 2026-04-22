/**
 * 容器块扩展 — tip / warning / info / danger
 *
 * Markdown 表示：`:::tip 标题\n内容\n:::`
 * 与 md-parser-core 的 remark-container 对齐，确保只读渲染一致。
 *
 * schema：
 *   container: {
 *     attrs: { type, title }
 *     content: block+
 *     parseDOM: div.custom-container
 *     toDOM: <div class="custom-container custom-container-{type}">...</div>
 *   }
 */

import { mergeAttributes, Node } from '@tiptap/core';

export const CONTAINER_TYPES = ['tip', 'warning', 'info', 'danger'] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

export interface ContainerAttrs {
  type: ContainerType;
  title: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    container: {
      /** 插入容器 */
      setContainer: (attrs: { type: ContainerType; title?: string }) => ReturnType;
      /** 切换容器类型 */
      toggleContainer: (attrs: { type: ContainerType; title?: string }) => ReturnType;
      /** 解包容器（保留内容） */
      unsetContainer: () => ReturnType;
    };
  }
}

export const Container = Node.create({
  name: 'container',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'tip' as ContainerType,
        parseHTML: (el) => {
          const classList = (el as HTMLElement).classList;
          for (const t of CONTAINER_TYPES) {
            if (classList.contains(`custom-container-${t}`)) return t;
          }
          return 'tip';
        },
        renderHTML: (attrs) => ({
          'data-type': attrs.type,
        }),
      },
      title: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).dataset.title ?? null,
        renderHTML: (attrs) => {
          if (!attrs.title) return {};
          return { 'data-title': attrs.title };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.custom-container',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const type = (node.attrs.type ?? 'tip') as ContainerType;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `custom-container custom-container-${type}`,
      }),
      0, // 0 表示子内容渲染到这里
    ];
  },

  addCommands() {
    return {
      setContainer:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, {
            type: attrs.type,
            title: attrs.title ?? null,
          }),
      toggleContainer:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, {
            type: attrs.type,
            title: attrs.title ?? null,
          }),
      unsetContainer:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
