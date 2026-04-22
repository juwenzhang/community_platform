/**
 * 默认扩展集合
 *
 * Phase 1：StarterKit + Placeholder + Link
 * Phase 2：+ CodeBlock(lowlight) + Table + TaskList + Image + Container + Mermaid + Math
 * Phase 3：+ ExtraKeybindings + WordCount + SmartPaste + ImageUpload（交互层）
 * Slash/Bubble/Floating Menu 在 React 层以组件形式接入，不走默认扩展
 */

import type { AnyExtension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  BlockMath,
  CodeBlock,
  Container,
  Image,
  InlineMath,
  Mermaid,
  TableExtensions,
  TaskListExtensions,
} from '../blocks';
import {
  ExtraKeybindings,
  ImageUpload,
  type ImageUploadOptions,
  SmartPaste,
  type SmartPasteOptions,
  WordCount,
} from '../interactions';

export interface DefaultExtensionsOptions {
  placeholder?: string;
  /** 图片上传选项（配置后粘贴/拖拽图片自动上传）；未配置时 ImageUpload Extension 仍注册但行为降级 */
  imageUpload?: ImageUploadOptions;
  /** 智能粘贴选项（URL 自动链接、Markdown 识别、Ctrl+Shift+V 纯文本）*/
  smartPaste?: SmartPasteOptions;
  /** 关闭交互增强（有些场景例如评论编辑可能不需要） */
  disableInteractions?: boolean;
}

/**
 * 返回默认扩展数组
 */
export function getDefaultExtensions(options: DefaultExtensionsOptions = {}): AnyExtension[] {
  const { placeholder = '开始书写，输入 / 快速插入...' } = options;

  const baseExtensions: AnyExtension[] = [
    StarterKit.configure({
      // 禁用 starter-kit 自带的 codeBlock，改用 CodeBlockLowlight
      codeBlock: false,
    }),
    // Phase 2 自定义块
    CodeBlock,
    Image,
    Container,
    Mermaid,
    InlineMath,
    BlockMath,
    ...TableExtensions,
    ...TaskListExtensions,
    // 辅助
    Placeholder.configure({
      placeholder,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
  ];

  if (options.disableInteractions) {
    return baseExtensions;
  }

  const interactionExtensions: AnyExtension[] = [
    WordCount,
    ExtraKeybindings,
    SmartPaste.configure(options.smartPaste ?? {}),
    ImageUpload.configure(options.imageUpload ?? {}),
  ];

  return [...baseExtensions, ...interactionExtensions];
}
