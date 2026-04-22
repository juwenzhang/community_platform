/**
 * 额外快捷键 Extension
 *
 * 在 StarterKit 已有快捷键基础上补齐：
 *   - Mod+K：插入/编辑链接（prompt 输入）
 *   - Mod+Shift+X：删除线（StarterKit 默认是 Mod+Shift+S，这里兼容）
 *   - Mod+Shift+C：行内代码
 *   - Mod+Enter / Shift+Enter：从 blockquote / container 一键跳出
 *   - Tab：在代码块里插入 2 空格，其他场景走默认
 *   - Enter：blockquote / container 里空段落时跳出到外层
 *
 * 注：代码块退出由 StarterKit 的 CodeBlock 内置处理：
 *   - exitOnTripleEnter: 连续 3 次 Enter 退出
 *   - exitOnArrowDown:   末尾按 ↓ 退出
 * 所以这里不再自定义代码块的 Enter，避免干扰默认行为。
 *
 * 设计原则：只补齐 StarterKit 没覆盖的，不重复定义已有快捷键。
 */

import { type Editor, Extension } from '@tiptap/core';

/**
 * 工具：在当前顶层块节点之后插入空段落并把光标移过去
 */
function exitToNextParagraph(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  const blockDepth = $from.depth >= 1 ? 1 : 0;
  const afterBlock = $from.after(blockDepth);
  return editor
    .chain()
    .focus()
    .insertContentAt(afterBlock, { type: 'paragraph' })
    .setTextSelection(afterBlock + 1)
    .run();
}

export const ExtraKeybindings = Extension.create({
  name: 'extraKeybindings',

  addKeyboardShortcuts() {
    return {
      // ── Mod+K：插入链接 ──
      'Mod-k': () => {
        const editor = this.editor;
        const prev = editor.getAttributes('link').href as string | undefined;
        const href = window.prompt('链接 URL', prev ?? '');
        if (href === null) return true;
        if (href === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
        }
        return true;
      },

      // ── Mod+Shift+X：删除线 ──
      'Mod-Shift-x': () => this.editor.chain().focus().toggleStrike().run(),

      // ── Mod+Shift+C：行内代码 ──
      'Mod-Shift-c': () => this.editor.chain().focus().toggleCode().run(),

      // ── Mod+Enter：一键从 blockquote / container 跳出（代码块由 StarterKit 的 exitCode 处理）──
      'Mod-Enter': () => {
        const editor = this.editor;
        if (editor.isActive('blockquote') || editor.isActive('container')) {
          return exitToNextParagraph(editor);
        }
        return false;
      },

      // ── Tab：在代码块里插入 2 空格 ──
      Tab: () => {
        const editor = this.editor;
        if (editor.isActive('codeBlock')) {
          editor.commands.insertContent('  ');
          return true;
        }
        return false;
      },

      // ── 连续两次 Enter 跳出 blockquote / container（不触碰 codeBlock）──
      Enter: () => {
        const editor = this.editor;
        // 代码块的 Enter 完全让 StarterKit 默认逻辑处理（含三连 Enter 退出）
        if (editor.isActive('codeBlock')) return false;

        const { $from } = editor.state.selection;
        const parent = $from.parent;

        // 当前段落必须为空
        if (parent.type.name !== 'paragraph' || parent.textContent.length > 0) {
          return false;
        }
        // 上一级是 blockquote 或 container 时才跳出
        if ($from.depth >= 2) {
          const grandparent = $from.node($from.depth - 1);
          if (grandparent.type.name === 'blockquote' || grandparent.type.name === 'container') {
            const grandEnd = $from.after($from.depth - 1);
            return editor
              .chain()
              .focus()
              .command(({ tr, dispatch }) => {
                if (!dispatch) return false;
                const paraStart = $from.before();
                const paraEnd = $from.after();
                tr.delete(paraStart, paraEnd);
                return true;
              })
              .insertContentAt(grandEnd - 1, { type: 'paragraph' })
              .run();
          }
        }
        return false;
      },
    };
  },
});
