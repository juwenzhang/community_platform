/**
 * Editor 工厂：封装 TipTap Editor 实例的创建
 *
 * 用法：
 * ```ts
 * const editor = await createEditor({
 *   content: '# Hello',
 *   onUpdate: (editor) => console.log(editor.getHTML()),
 * });
 * ```
 *
 * 注意：content 为字符串时视为 Markdown，需异步转为 PM JSON，因此工厂返回 Promise。
 */

import { Editor } from '@tiptap/core';
import { markdownToJson } from '../convert';
import type { CreateEditorOptions, ProseMirrorJSON } from '../types/editor';
import { getDefaultExtensions } from './extensions';

export async function createEditor(options: CreateEditorOptions = {}): Promise<Editor> {
  const {
    content,
    placeholder,
    editable = true,
    extensions = [],
    onUpdate,
    onCreate,
    onBlur,
  } = options;

  // 解析 content
  let resolvedContent: ProseMirrorJSON | undefined;
  if (typeof content === 'string') {
    resolvedContent = await markdownToJson(content);
  } else if (content) {
    resolvedContent = content;
  }

  const editor = new Editor({
    content: resolvedContent,
    editable,
    extensions: [...getDefaultExtensions({ placeholder }), ...extensions],
    onUpdate: onUpdate ? ({ editor }) => onUpdate(editor as Editor) : undefined,
    onCreate: onCreate ? ({ editor }) => onCreate(editor as Editor) : undefined,
    onBlur: onBlur ? ({ editor }) => onBlur(editor as Editor) : undefined,
  });

  return editor;
}
