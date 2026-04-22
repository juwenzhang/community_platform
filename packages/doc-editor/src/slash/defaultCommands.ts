/**
 * 默认 Slash 命令集
 *
 * 15 个命令，按语义分组：
 * - 基础块：段落、标题 H1/H2/H3、无序/有序/任务列表、引用、分隔线
 * - 代码与媒体：代码块、图片
 * - 表格
 * - 容器：tip/warning
 * - 高级：数学公式、Mermaid
 */

import type { Editor, Range } from '@tiptap/core';
import type { SlashCommandItem } from './types';

/**
 * 辅助：执行命令前先删除触发 range（`/keyword`）
 */
function withClean(
  fn: (editor: Editor, range: Range) => void,
): (opts: { editor: Editor; range: Range }) => void {
  return ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).run();
    fn(editor, range);
  };
}

export const defaultSlashCommands: SlashCommandItem[] = [
  // ── 基础块 ──────────────────────────────────────────────
  {
    id: 'paragraph',
    title: '正文',
    description: '普通段落',
    icon: '¶',
    group: 'basic',
    keywords: ['paragraph', 'text', 'p', '正文', '段落'],
    command: withClean((editor) => {
      editor.chain().focus().setParagraph().run();
    }),
  },
  {
    id: 'heading-1',
    title: '一级标题',
    description: '大号标题',
    icon: 'H1',
    group: 'basic',
    keywords: ['h1', 'heading', 'title', '标题'],
    command: withClean((editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    }),
  },
  {
    id: 'heading-2',
    title: '二级标题',
    description: '中号标题',
    icon: 'H2',
    group: 'basic',
    keywords: ['h2', 'heading', '标题'],
    command: withClean((editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    }),
  },
  {
    id: 'heading-3',
    title: '三级标题',
    description: '小号标题',
    icon: 'H3',
    group: 'basic',
    keywords: ['h3', 'heading', '标题'],
    command: withClean((editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }),
  },
  {
    id: 'bullet-list',
    title: '无序列表',
    description: '项目符号列表',
    icon: '•',
    group: 'list',
    keywords: ['ul', 'bullet', 'list', '列表', '无序'],
    command: withClean((editor) => {
      editor.chain().focus().toggleBulletList().run();
    }),
  },
  {
    id: 'ordered-list',
    title: '有序列表',
    description: '编号列表',
    icon: '1.',
    group: 'list',
    keywords: ['ol', 'ordered', 'numbered', '列表', '有序'],
    command: withClean((editor) => {
      editor.chain().focus().toggleOrderedList().run();
    }),
  },
  {
    id: 'task-list',
    title: '任务列表',
    description: '带复选框的列表',
    icon: '☑',
    group: 'list',
    keywords: ['task', 'todo', 'checkbox', '任务', '待办'],
    command: withClean((editor) => {
      editor.chain().focus().toggleTaskList().run();
    }),
  },
  {
    id: 'blockquote',
    title: '引用',
    description: '引用块',
    icon: '❝',
    group: 'basic',
    keywords: ['quote', 'blockquote', '引用'],
    command: withClean((editor) => {
      editor.chain().focus().toggleBlockquote().run();
    }),
  },
  {
    id: 'horizontal-rule',
    title: '分隔线',
    description: '水平分隔线',
    icon: '─',
    group: 'basic',
    keywords: ['hr', 'divider', 'rule', '分隔'],
    command: withClean((editor) => {
      editor.chain().focus().setHorizontalRule().run();
    }),
  },

  // ── 代码 & 媒体 ──────────────────────────────────────────
  {
    id: 'code-block',
    title: '代码块',
    description: '带语法高亮的代码块',
    icon: '</>',
    group: 'media',
    keywords: ['code', 'codeblock', 'pre', '代码'],
    command: withClean((editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    }),
  },
  {
    id: 'image',
    title: '图片',
    description: '插入图片',
    icon: '🖼',
    group: 'media',
    keywords: ['image', 'img', 'picture', 'photo', '图片'],
    command: withClean((editor) => {
      // 插入占位图片节点；真实上传由 NodeView 或外部触发
      const url = window.prompt('图片 URL（后续 Phase 会换成上传）');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }),
  },

  // ── 表格 ─────────────────────────────────────────────────
  {
    id: 'table',
    title: '表格',
    description: '插入 3×3 表格',
    icon: '⊞',
    group: 'media',
    keywords: ['table', 'grid', '表格'],
    command: withClean((editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }),
  },

  // ── 容器 ─────────────────────────────────────────────────
  {
    id: 'container-tip',
    title: '提示',
    description: '提示容器（tip）',
    icon: '💡',
    group: 'advanced',
    keywords: ['tip', 'container', '提示'],
    command: withClean((editor) => {
      editor
        .chain()
        .focus()
        // biome-ignore lint/suspicious/noExplicitAny: TipTap 动态命令
        .insertContent({
          type: 'container',
          attrs: { type: 'tip', title: null },
          content: [{ type: 'paragraph' }],
        })
        .run();
    }),
  },
  {
    id: 'container-warning',
    title: '警告',
    description: '警告容器（warning）',
    icon: '⚠️',
    group: 'advanced',
    keywords: ['warning', 'warn', 'container', '警告'],
    command: withClean((editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'container',
          attrs: { type: 'warning', title: null },
          content: [{ type: 'paragraph' }],
        })
        .run();
    }),
  },

  // ── 高级 ─────────────────────────────────────────────────
  {
    id: 'math',
    title: '数学公式',
    description: '块级数学公式（KaTeX）',
    icon: '√',
    group: 'advanced',
    keywords: ['math', 'latex', 'katex', 'formula', '数学', '公式'],
    command: withClean((editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'blockMath',
          attrs: { formula: 'E = mc^2' },
        })
        .run();
    }),
  },
  {
    id: 'mermaid',
    title: 'Mermaid 图',
    description: '流程图 / 时序图',
    icon: '📊',
    group: 'advanced',
    keywords: ['mermaid', 'flowchart', 'diagram', '流程图', '图表'],
    command: withClean((editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mermaid',
          attrs: { code: 'graph TD\n  A[开始] --> B[结束]' },
        })
        .run();
    }),
  },
];

/**
 * 分组元数据（用于 UI 展示）
 */
export const defaultGroupLabels: Record<string, string> = {
  basic: '基础',
  list: '列表',
  media: '代码与媒体',
  advanced: '高级',
};
