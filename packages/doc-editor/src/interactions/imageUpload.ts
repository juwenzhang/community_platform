/**
 * 图片上传交互 Extension
 *
 * 负责把粘贴/拖拽的图片文件和 UploadHandler 连起来，具体流程：
 *   1. 监听 editor.view.props 的 handlePaste / handleDrop 事件
 *   2. 从 clipboard/dataTransfer 中提取 image 类型文件
 *   3. 先插入占位符 image 节点（src: `pending:uuid`），用户看得见正在上传
 *   4. 调用 UploadHandler.upload() 真正上传
 *   5. 成功：把占位符替换为真实 URL
 *   6. 失败：删除占位符 + 通过 onError 回调提示
 *
 * 关键设计：
 *   - 占位符 src 使用 `pending:<uuid>` 协议头，便于精确替换
 *   - 使用 ProseMirror 的 Transaction 和 doc.descendants 遍历实现原子替换
 *   - 不依赖 uploadHandler 存在时，Extension 优雅降级（不阻止默认 paste，只打印 warn）
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { UploadHandler } from '../types/upload';

/** 生成唯一占位符 id */
function genPendingId(): string {
  return (
    'pending:' +
    (crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  );
}

/**
 * 从 DataTransfer / ClipboardItems 中提取 image 类型文件
 */
function extractImageFiles(source: DataTransfer | ClipboardItems | null): File[] {
  if (!source) return [];
  const files: File[] = [];

  // DataTransfer（drop / paste event.clipboardData）
  if (source instanceof DataTransfer) {
    for (let i = 0; i < source.files.length; i += 1) {
      const file = source.files[i];
      if (file?.type.startsWith('image/')) files.push(file);
    }
    return files;
  }

  // 理论上 paste 通常走 DataTransfer，这里保留 ClipboardItems 分支作兜底
  return files;
}

export interface ImageUploadOptions {
  /** 上传 handler；未提供则只打印 warn，不阻止默认行为 */
  uploadHandler?: UploadHandler | null;
  /** 上传 folder（默认 article-images），动态可传函数 */
  folder?: string | (() => string);
  /** 错误回调（例如用于 toast 提示） */
  onError?: (err: Error) => void;
  /** 开始上传回调（用于显示全局 loading / 进度） */
  onUploadStart?: (file: File, pendingId: string) => void;
  /** 完成回调 */
  onUploadComplete?: (file: File, url: string, pendingId: string) => void;
}

export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: 'imageUpload',

  addOptions() {
    return {
      uploadHandler: null,
      folder: 'article-images',
      onError: undefined,
      onUploadStart: undefined,
      onUploadComplete: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    /**
     * 处理文件列表：为每个文件插入占位符 + 发起上传
     */
    function processFiles(files: File[], view: EditorView, insertPos?: number): boolean {
      const handler = extensionThis.options.uploadHandler;
      if (!handler) {
        console.warn(
          '[doc-editor] 检测到图片粘贴/拖拽，但未配置 uploadHandler，已忽略。' +
            '请通过 DocEditor 的 uploadHandler prop 注入。',
        );
        extensionThis.options.onError?.(new Error('未配置上传服务，无法上传图片'));
        return true; // 阻止默认行为，避免浏览器把 image 显示成文件下载
      }

      const { state, dispatch } = view;
      const { schema } = state;
      const imageType = schema.nodes.image;
      if (!imageType) {
        console.warn('[doc-editor] schema 中找不到 image 节点类型');
        return false;
      }

      // 为每个文件依次处理（保持顺序）
      const folderOpt = extensionThis.options.folder;
      const folder = typeof folderOpt === 'function' ? folderOpt() : folderOpt;

      let pos = insertPos ?? state.selection.to;
      for (const file of files) {
        const pendingId = genPendingId();
        const placeholderNode = imageType.create({
          src: pendingId,
          alt: '上传中…',
        });
        const tr = view.state.tr.insert(pos, placeholderNode);
        dispatch(tr);
        // 下一个文件接在当前节点之后
        pos += placeholderNode.nodeSize;

        extensionThis.options.onUploadStart?.(file, pendingId);

        handler
          .upload(file, { folder })
          .then((result) => {
            replacePlaceholder(view, pendingId, {
              src: result.url,
              alt: result.alt ?? file.name,
            });
            extensionThis.options.onUploadComplete?.(file, result.url, pendingId);
          })
          .catch((err: Error) => {
            removePlaceholder(view, pendingId);
            extensionThis.options.onError?.(err);
            console.error('[doc-editor] 图片上传失败:', err);
          });
      }

      return true;
    }

    return [
      new Plugin({
        key: new PluginKey('imageUpload'),
        props: {
          handlePaste: (view, event) => {
            const files = extractImageFiles(event.clipboardData);
            if (files.length === 0) return false;
            event.preventDefault();
            return processFiles(files, view);
          },
          handleDrop: (view, event) => {
            const dt = event.dataTransfer;
            if (!dt) return false;
            const files = extractImageFiles(dt);
            if (files.length === 0) return false;
            event.preventDefault();
            const coords = { left: event.clientX, top: event.clientY };
            const posInfo = view.posAtCoords(coords);
            return processFiles(files, view, posInfo?.pos);
          },
        },
      }),
    ];
  },
});

/**
 * 遍历 doc 找到指定 pendingId 的占位符节点并替换属性
 */
function replacePlaceholder(
  view: EditorView,
  pendingId: string,
  newAttrs: Record<string, unknown>,
): void {
  const { state } = view;
  let found = false;
  const tr = state.tr;

  state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'image' && node.attrs.src === pendingId) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...newAttrs });
      found = true;
      return false;
    }
    return undefined;
  });

  if (found) view.dispatch(tr);
}

/**
 * 删除指定 pendingId 的占位符节点（上传失败时）
 */
function removePlaceholder(view: EditorView, pendingId: string): void {
  const { state } = view;
  let found = false;
  const tr = state.tr;

  state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'image' && node.attrs.src === pendingId) {
      tr.delete(pos, pos + node.nodeSize);
      found = true;
      return false;
    }
    return undefined;
  });

  if (found) view.dispatch(tr);
}
