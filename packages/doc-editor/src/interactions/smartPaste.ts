/**
 * 智能粘贴 Extension
 *
 * 三种增强：
 *   1. URL 粘贴：选中文本后粘贴纯 URL → 给选中文本加链接（不覆盖文本）
 *   2. Markdown 粘贴：粘贴内容像 Markdown 时 → parse 为富文本（需传入 markdownToJson）
 *   3. Ctrl+Shift+V：剥离格式，粘贴为纯文本
 *
 * 判断「像 Markdown」的启发式：
 *   - 开头 `# ` / `## ` / `### ` / `- ` / `* ` / `1. ` / `> ` / 「```」
 *   - 包含典型 Markdown 语法（`**xx**` / `` `xx` `` / `[xx](yy)`）且 > 2 处
 *
 * 设计原则：
 *   - 不引入副作用（markdownToJson 可选）
 *   - 可通过 options 开关各功能
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

function looksLikeMarkdown(text: string): boolean {
  const lines = text.split('\n');
  // 起手式：第一行就是 Markdown 特征
  const firstLine = lines[0]?.trim() ?? '';
  if (/^#{1,6}\s+/.test(firstLine)) return true;
  if (/^(?:-|\*|\d+\.)\s+/.test(firstLine)) return true;
  if (/^>\s+/.test(firstLine)) return true;
  if (firstLine.startsWith('```')) return true;

  // 多行内容：多处 Markdown 特征
  let hits = 0;
  const patterns = [
    /\*\*[^*\n]+\*\*/, // bold
    /`[^`\n]+`/, // inline code
    /\[[^\]\n]+\]\([^)\n]+\)/, // link
    /^#{1,6}\s+/m, // heading anywhere
    /^(?:-|\*|\d+\.)\s+/m, // list item anywhere
    /```[\s\S]*?```/, // fenced code
  ];
  for (const p of patterns) {
    if (p.test(text)) hits += 1;
  }
  return hits >= 2;
}

export interface SmartPasteOptions {
  /** 启用 URL 自动链接（默认 true） */
  enableUrlToLink?: boolean;
  /** 启用 Markdown 识别（默认 true，但需要提供 markdownToJson） */
  enableMarkdownDetection?: boolean;
  /** Markdown 解析器（异步）；未提供则关闭该能力 */
  markdownToJson?: (md: string) => Promise<unknown>;
  /** 触发 Markdown 解析的最小长度（避免小字符串误判），默认 20 */
  markdownMinLength?: number;
}

export const SmartPaste = Extension.create<SmartPasteOptions>({
  name: 'smartPaste',

  addOptions() {
    return {
      enableUrlToLink: true,
      enableMarkdownDetection: true,
      markdownToJson: undefined,
      markdownMinLength: 20,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey('smartPaste'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (!text) return false;

            const { state, dispatch } = view;
            const { selection, schema } = state;

            // ── 1. 选中文本 + 粘贴 URL → 加链接 ──
            if (options.enableUrlToLink && !selection.empty && URL_REGEX.test(text.trim())) {
              const linkMarkType = schema.marks.link;
              if (linkMarkType) {
                const tr = state.tr.addMark(
                  selection.from,
                  selection.to,
                  linkMarkType.create({ href: text.trim() }),
                );
                dispatch(tr);
                event.preventDefault();
                return true;
              }
            }

            // ── 2. 粘贴内容像 Markdown → 解析为富文本 ──
            if (
              options.enableMarkdownDetection &&
              options.markdownToJson &&
              text.length >= (options.markdownMinLength ?? 20) &&
              looksLikeMarkdown(text)
            ) {
              event.preventDefault();
              options.markdownToJson(text).then((json) => {
                // biome-ignore lint/suspicious/noExplicitAny: ProseMirrorJSON 与 TipTap JSONContent 等价
                this.editor.commands.insertContent(json as any);
              });
              return true;
            }

            // ── 否则走默认粘贴（TipTap 内置已处理 HTML/图片等）──
            return false;
          },
        },
      }),

      // Ctrl/Cmd+Shift+V：粘贴为纯文本
      new Plugin({
        key: new PluginKey('pastePlainText'),
        props: {
          handleKeyDown: (view, event) => {
            const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
            const cmd = isMac ? event.metaKey : event.ctrlKey;
            // 触发 Cmd+Shift+V：我们把当前默认行为交给浏览器
            // 但标记「下一次 paste 事件强制走纯文本」
            if (cmd && event.shiftKey && event.key.toLowerCase() === 'v') {
              // 通过 data attribute 标记 flag，在下一次 handlePaste 读取
              view.dom.dataset.pastePlain = '1';
              // 不阻止默认：浏览器会触发 paste 事件，由下面的 plugin 处理
            }
            return false;
          },
          handlePaste: (view, event) => {
            if (view.dom.dataset.pastePlain !== '1') return false;
            // 消费 flag
            delete view.dom.dataset.pastePlain;

            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (!text) return false;

            event.preventDefault();
            view.dispatch(
              view.state.tr.insertText(text, view.state.selection.from, view.state.selection.to),
            );
            return true;
          },
        },
      }),
    ];
  },
});
