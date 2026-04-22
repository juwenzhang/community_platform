/**
 * Slash 命令类型定义
 */

import type { Editor, Range } from '@tiptap/core';

/**
 * Slash 命令项
 *
 * 用户在编辑器中输入 `/` 触发命令面板，每个命令实现 `command` 函数
 * 以对当前选区执行相应的 TipTap transaction。
 */
export interface SlashCommandItem {
  /** 命令唯一 ID（用于 key） */
  id: string;
  /** 显示标题 */
  title: string;
  /** 简短描述 */
  description?: string;
  /** 图标（可以是 emoji 或图标 key，由 UI 层决定如何渲染） */
  icon?: string;
  /** 关键字（用于模糊匹配） */
  keywords?: string[];
  /** 分组（用于面板分组展示） */
  group?: string;
  /** 执行命令 */
  command: (opts: { editor: Editor; range: Range }) => void;
}

/**
 * Slash 命令组
 */
export interface SlashCommandGroup {
  id: string;
  title: string;
  items: SlashCommandItem[];
}

/**
 * Slash 命令 props（传递给 renderer）
 */
export interface SlashCommandProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  editor: Editor;
  range: Range;
  query: string;
}

/**
 * 命令面板 Renderer 接口
 *
 * Renderer 负责：
 * - onStart: 初始渲染面板
 * - onUpdate: query 变化时更新 items
 * - onKeyDown: 捕获方向键/回车/Esc
 * - onExit: 清理面板
 */
export interface SlashCommandRenderer {
  onStart: (props: SlashCommandProps) => void;
  onUpdate: (props: SlashCommandProps) => void;
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  onExit: () => void;
}
