/**
 * 核心编辑器类型定义
 */

import type { AnyExtension, Editor } from '@tiptap/core';

/**
 * 创建 Editor 实例的配置
 *
 * 注意：content 可以是 Markdown 字符串或 ProseMirror JSON。
 * 字符串一律视为 Markdown，通过 markdownToJson 转换后注入。
 */
export interface CreateEditorOptions {
  /** 初始内容：Markdown 字符串或 ProseMirror JSON */
  content?: string | ProseMirrorJSON;
  /** 占位符文案 */
  placeholder?: string;
  /** 是否可编辑，默认 true */
  editable?: boolean;
  /** 追加到默认扩展集合的额外扩展 */
  extensions?: AnyExtension[];
  /** 内容变化时触发（参数是 Editor 实例）*/
  onUpdate?: (editor: Editor) => void;
  /** 实例创建完成时触发 */
  onCreate?: (editor: Editor) => void;
  /** 失焦时触发 */
  onBlur?: (editor: Editor) => void;
}

/**
 * ProseMirror JSON 文档的顶层形态
 *
 * 精确类型见 @tiptap/core 的 JSONContent，这里保留 structural 结构
 * 以便未来独立于 TipTap 使用。
 */
export interface ProseMirrorJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorJSON[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}
