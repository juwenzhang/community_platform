/**
 * 任务列表块
 *
 * 使用 TipTap 官方 TaskList + TaskItem
 * Markdown 表示：`- [x]` / `- [ ]`
 */

import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';

export const TaskListExtensions = [
  TaskList.configure({
    HTMLAttributes: { class: 'editor-task-list' },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: { class: 'editor-task-item' },
  }),
];
