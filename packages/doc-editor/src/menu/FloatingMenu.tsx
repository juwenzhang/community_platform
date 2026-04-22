/**
 * Floating Menu — 空行时浮现的"插入"工具条
 *
 * 基于 @tiptap/extension-floating-menu，暴露为 React 组件。
 * 与 Slash 命令互补：Slash 需要用户主动输入 `/`，Floating Menu 在空段落自动浮现。
 */

import type { Editor } from '@tiptap/core';
import { FloatingMenu as TiptapFloatingMenu } from '@tiptap/react';
import type { ReactNode } from 'react';

export interface FloatingMenuItem {
  id: string;
  title: string;
  icon: ReactNode;
  command: (editor: Editor) => void;
}

export interface FloatingMenuProps {
  editor: Editor;
  items?: FloatingMenuItem[];
  children?: ReactNode;
}

export const defaultFloatingItems: FloatingMenuItem[] = [
  {
    id: 'heading-1',
    title: '一级标题',
    icon: 'H1',
    command: (e) => {
      e.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading-2',
    title: '二级标题',
    icon: 'H2',
    command: (e) => {
      e.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'bullet-list',
    title: '无序列表',
    icon: '•',
    command: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'code-block',
    title: '代码块',
    icon: '</>',
    command: (e) => {
      e.chain().focus().toggleCodeBlock().run();
    },
  },
];

/**
 * Floating Menu 组件
 *
 * 使用：`<FloatingMenu editor={editor} />` 放在 EditorContent 同级
 */
export function FloatingMenu({
  editor,
  items = defaultFloatingItems,
  children,
}: FloatingMenuProps) {
  return (
    <TiptapFloatingMenu
      editor={editor}
      shouldShow={({ editor, state }) => {
        const { selection } = state;
        const { $from } = selection;

        // 仅在空段落展示（避免和 Slash 重叠）
        if (!selection.empty) return false;
        const parent = $from.parent;
        if (parent.type.name !== 'paragraph') return false;
        if (parent.textContent.length > 0) return false;
        // 不在 container / code 等特殊块的内部段落展示
        if (editor.isActive('codeBlock')) return false;
        if (editor.isActive('container')) return false;
        return true;
      }}
    >
      <div className="doc-editor-floating-menu">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            aria-label={item.title}
            className="doc-editor-floating-menu__item"
            onClick={() => item.command(editor)}
          >
            {item.icon}
          </button>
        ))}
        {children}
      </div>
    </TiptapFloatingMenu>
  );
}
