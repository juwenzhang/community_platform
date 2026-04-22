/**
 * Slash 命令 Extension
 *
 * 基于 @tiptap/suggestion 实现，用户输入 `/` 触发命令面板。
 *
 * 关键约束：
 * - 只在空行或行首（可配置）触发，避免在文本中间误触发
 * - 字符串 query 与 item 的 title/keywords 做模糊匹配
 * - command 函数由 caller 注入，不在 Extension 内硬编码具体命令
 */

import { Extension, type Range } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import type { SlashCommandItem, SlashCommandRenderer } from './types';

export interface SlashCommandOptions {
  /** 命令列表（可以是静态数组或动态函数） */
  items: SlashCommandItem[] | ((query: string) => SlashCommandItem[]);
  /** Renderer 工厂函数 */
  render: () => SlashCommandRenderer;
  /** 触发字符，默认 `/` */
  char?: string;
  /** 是否仅在行首触发，默认 false */
  startOfLine?: boolean;
}

/**
 * 默认的模糊匹配：title + keywords 包含 query（不区分大小写）
 */
function defaultFilter(items: SlashCommandItem[], query: string): SlashCommandItem[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      items: [],
      render: () => ({
        onStart: () => undefined,
        onUpdate: () => undefined,
        onKeyDown: () => false,
        onExit: () => undefined,
      }),
      char: '/',
      startOfLine: false,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const suggestionOptions: Omit<SuggestionOptions<SlashCommandItem>, 'editor'> = {
      char: options.char ?? '/',
      startOfLine: options.startOfLine ?? false,
      allowSpaces: false,
      allowedPrefixes: [' ', '\n'],
      command: ({ editor, range, props }) => {
        props.command({ editor, range });
      },
      items: ({ query }) => {
        const raw = typeof options.items === 'function' ? options.items(query) : options.items;
        return defaultFilter(raw, query);
      },
      render: () => {
        const renderer = options.render();
        return {
          onStart: (props) => {
            renderer.onStart({
              items: props.items,
              command: (item) => props.command(item),
              editor: props.editor,
              range: props.range,
              query: props.query,
            });
          },
          onUpdate: (props) => {
            renderer.onUpdate({
              items: props.items,
              command: (item) => props.command(item),
              editor: props.editor,
              range: props.range,
              query: props.query,
            });
          },
          onKeyDown: (props) => {
            return renderer.onKeyDown({ event: props.event });
          },
          onExit: () => {
            renderer.onExit();
          },
        };
      },
    };

    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        ...suggestionOptions,
      }),
    ];
  },
});

/**
 * 辅助：对 range 执行命令前先删除触发字符和 query
 */
export function runSlashCommand(
  editor: import('@tiptap/core').Editor,
  range: Range,
  fn: (chain: ReturnType<import('@tiptap/core').Editor['chain']>) => void,
): void {
  const chain = editor.chain().focus().deleteRange(range);
  fn(chain);
  chain.run();
}
