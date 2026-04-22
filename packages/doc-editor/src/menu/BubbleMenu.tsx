/**
 * Bubble Menu — 选中文本时浮现的格式工具条
 *
 * 基于 @tiptap/extension-bubble-menu，暴露为 React 组件。
 * 默认按钮：bold / italic / strike / code / link
 * 使用方可以通过 children 提供自定义按钮，或传 items 配置数组。
 */

import type { Editor } from '@tiptap/core';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react';
import type { ReactNode } from 'react';

export interface BubbleMenuItem {
  id: string;
  title: string;
  icon: ReactNode;
  isActive?: (editor: Editor) => boolean;
  command: (editor: Editor) => void;
}

export interface BubbleMenuProps {
  editor: Editor;
  items?: BubbleMenuItem[];
  children?: ReactNode;
}

export const defaultBubbleItems: BubbleMenuItem[] = [
  {
    id: 'bold',
    title: '粗体',
    icon: <strong>B</strong>,
    isActive: (e) => e.isActive('bold'),
    command: (e) => {
      e.chain().focus().toggleBold().run();
    },
  },
  {
    id: 'italic',
    title: '斜体',
    icon: <em>I</em>,
    isActive: (e) => e.isActive('italic'),
    command: (e) => {
      e.chain().focus().toggleItalic().run();
    },
  },
  {
    id: 'strike',
    title: '删除线',
    icon: <s>S</s>,
    isActive: (e) => e.isActive('strike'),
    command: (e) => {
      e.chain().focus().toggleStrike().run();
    },
  },
  {
    id: 'code',
    title: '行内代码',
    icon: <code>{'<>'}</code>,
    isActive: (e) => e.isActive('code'),
    command: (e) => {
      e.chain().focus().toggleCode().run();
    },
  },
  {
    id: 'link',
    title: '链接',
    icon: '🔗',
    isActive: (e) => e.isActive('link'),
    command: (e) => {
      const prev = e.getAttributes('link').href as string | undefined;
      const href = window.prompt('链接 URL', prev ?? '');
      if (href === null) return;
      if (href === '') {
        e.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        e.chain().focus().extendMarkRange('link').setLink({ href }).run();
      }
    },
  },
];

/**
 * Bubble Menu 组件
 *
 * 使用：`<BubbleMenu editor={editor} />` 放在 EditorContent 同级
 */
export function BubbleMenu({ editor, items = defaultBubbleItems, children }: BubbleMenuProps) {
  return (
    <TiptapBubbleMenu
      editor={editor}
      // 仅在有文本选区（非空、非 NodeSelection）时展示
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false;
        // 不在 code block / 图片等不需要富文本格式的节点内展示
        if (editor.isActive('codeBlock')) return false;
        if (editor.isActive('mermaid')) return false;
        if (editor.isActive('blockMath')) return false;
        return true;
      }}
    >
      <div className="doc-editor-bubble-menu">
        {items.map((item) => {
          const active = item.isActive?.(editor) ?? false;
          return (
            <button
              key={item.id}
              type="button"
              title={item.title}
              aria-label={item.title}
              aria-pressed={active}
              className={
                active
                  ? 'doc-editor-bubble-menu__item doc-editor-bubble-menu__item--active'
                  : 'doc-editor-bubble-menu__item'
              }
              onClick={() => item.command(editor)}
            >
              {item.icon}
            </button>
          );
        })}
        {children}
      </div>
    </TiptapBubbleMenu>
  );
}
