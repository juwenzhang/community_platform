/**
 * DocEditor — 一等公民 React 组件
 *
 * 封装了 TipTap useEditor + 默认扩展 + Slash/Bubble/Floating/BlockHandle + autosave 钩子调用者。
 * 使用方只需要：
 *   <DocEditor
 *     initialContent={markdown}
 *     onChange={(md, json) => ...}
 *     onSave={async (md) => { await api.update(md) }}
 *     articleId={id}
 *     serverUpdatedAt={ts}
 *     uploadHandler={handler}
 *   />
 *
 * 内部集成：
 *   - autosave（IndexedDB + remote + offline）
 *   - draft restore（挂载时检查 + 弹窗询问）
 *   - SaveStatusIndicator（状态条）
 *   - 全部菜单（Bubble / Floating / BlockHandle）
 *   - Slash 命令
 *
 * 消费方无需自己管理 useEditor 或各种 Hook。
 */

import type { AnyExtension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DraftRestorePrompt } from '../autosave/DraftRestorePrompt';
import { loadDraft } from '../autosave/DraftStore';
import { SaveStatusIndicator } from '../autosave/SaveStatusIndicator';
import { useAutosave } from '../autosave/useAutosave';
import { useDraftRestore } from '../autosave/useDraftRestore';
import { jsonToMarkdown } from '../convert/jsonToMarkdown';
import { markdownToJson } from '../convert/markdownToJson';
import { getDefaultExtensions } from '../core/extensions';
import { BlockHandle } from '../menu/BlockHandle';
import { BubbleMenu } from '../menu/BubbleMenu';
import { FloatingMenu } from '../menu/FloatingMenu';
import { defaultSlashCommands } from '../slash/defaultCommands';
import { createReactSlashRenderer } from '../slash/renderer';
import { SlashCommand } from '../slash/SlashCommand';
import type { SlashCommandItem } from '../slash/types';
import type { ProseMirrorJSON } from '../types/editor';
import type { UploadHandler } from '../types/upload';
import { useDocEditorContext } from './DocEditorProvider';

export interface DocEditorProps {
  /** 初始 Markdown 内容 */
  initialContent?: string;
  /** 占位符文案 */
  placeholder?: string;
  /** 只读模式 */
  readOnly?: boolean;
  /** 实时内容变化回调（每次编辑触发） */
  onChange?: (markdown: string, json: ProseMirrorJSON) => void;
  /** 远程保存回调 — 用于 autosave */
  onSave?: (markdown: string, json: ProseMirrorJSON) => Promise<void>;
  /** 文章 ID（autosave + 草稿恢复需要） */
  articleId?: string | null;
  /** 服务端最新 updatedAt（草稿恢复对比用） */
  serverUpdatedAt?: number | null;
  /** 上传 handler（优先级高于 Context） */
  uploadHandler?: UploadHandler | null;
  /** 额外的 Slash 命令（追加到默认列表） */
  extraSlashCommands?: SlashCommandItem[];
  /** 禁用自动保存（只展示编辑器，不持久化） */
  disableAutosave?: boolean;
  /** 隐藏保存状态指示器 */
  hideSaveStatus?: boolean;
  /** 自定义 autosave 的 debounce 毫秒数 */
  autosaveDebounceMs?: number;
  /** 自定义 autosave 的远程间隔毫秒数 */
  autosaveIntervalMs?: number;
  /** className hook — 外层容器 */
  className?: string;
  /** 编辑器实例就绪回调（供外部 hook 使用，如 EditorToc） */
  onEditorReady?: (editor: import('@tiptap/core').Editor | null) => void;
}

/**
 * 统一的块编辑器组件
 */
export function DocEditor({
  initialContent = '',
  placeholder = '开始书写，输入 / 快速插入...',
  readOnly = false,
  onChange,
  onSave,
  articleId = null,
  serverUpdatedAt = null,
  uploadHandler: propUploadHandler,
  extraSlashCommands = [],
  disableAutosave = false,
  hideSaveStatus = false,
  autosaveDebounceMs = 800,
  autosaveIntervalMs = 30_000,
  className,
  onEditorReady,
}: DocEditorProps) {
  const context = useDocEditorContext();
  const uploadHandler = propUploadHandler ?? context.uploadHandler ?? null;

  // draftId：优先 articleId，否则生成一个持久随机值（通过 useState 保证一次生成）
  const [draftId] = useState<string>(() => {
    if (articleId) return articleId;
    const key = 'doc-editor:new-draft-id';
    const existing = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (existing) return existing;
    const id = `draft-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, id);
    return id;
  });

  // Slash 扩展
  const slashExtension = useMemo(
    () =>
      SlashCommand.configure({
        items: [...defaultSlashCommands, ...extraSlashCommands],
        render: createReactSlashRenderer(),
      }),
    [extraSlashCommands],
  );

  // 编辑器初始化 — extensions 数组用 useMemo 稳定引用
  const extensions = useMemo<AnyExtension[]>(
    () => [
      ...getDefaultExtensions({
        placeholder,
        imageUpload: { uploadHandler },
        smartPaste: { markdownToJson },
      }),
      slashExtension,
    ],
    [placeholder, uploadHandler, slashExtension],
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      content: undefined, // 初始内容异步设置
      onUpdate: ({ editor }) => {
        if (!onChange) return;
        const json = editor.getJSON() as unknown as ProseMirrorJSON;
        const md = jsonToMarkdown(json);
        onChange(md, json);
      },
    },
    [readOnly],
  );

  // 初始内容写入标记 — 避免重复写入 + 避免 onUpdate 在初始化阶段触发 autosave
  const initializedRef = useRef<boolean>(false);

  // 初始内容：draft-first 策略
  //   1. 优先读 IndexedDB draft.contentJson（保留空段落等 Markdown 表达不了的内容）
  //      前提：draft 比 serverUpdatedAt 新
  //   2. 否则用 initialContent (Markdown) → parse → setContent
  // 这是用户"无感的草稿恢复" —— 不再弹窗问用户，默认使用更新版本
  useEffect(() => {
    if (!editor) return;
    if (initializedRef.current) return;
    let cancelled = false;

    async function init() {
      // 1. 尝试读本地 draft
      let useLocalDraft = false;
      if (draftId && !disableAutosave) {
        try {
          const draft = await loadDraft(draftId);
          if (draft && !cancelled) {
            // 本地 draft 比服务端新 → 用本地
            // serverUpdatedAt 为 null/undefined 时视为新文档，本地 draft 直接胜出
            const serverTs = serverUpdatedAt ?? 0;
            if (draft.updatedAt > serverTs) {
              // biome-ignore lint/suspicious/noExplicitAny: ProseMirrorJSON 与 JSONContent 兼容
              editor?.commands.setContent(draft.contentJson as any, false);
              useLocalDraft = true;
            }
          }
        } catch (err) {
          console.warn('[doc-editor] 读取本地草稿失败，回退到 initialContent:', err);
        }
      }

      // 2. 没用上本地 draft → 用 Markdown initialContent
      if (!useLocalDraft && !cancelled) {
        if (!initialContent) {
          editor?.commands.clearContent();
        } else {
          const json = await markdownToJson(initialContent);
          if (cancelled) return;
          // biome-ignore lint/suspicious/noExplicitAny: ProseMirrorJSON 与 JSONContent 兼容
          editor?.commands.setContent(json as any, false);
        }
      }

      if (!cancelled) initializedRef.current = true;
    }

    void init();

    return () => {
      cancelled = true;
    };
    // initialContent 变化时，强制重新初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialContent, disableAutosave, draftId, serverUpdatedAt]);

  // 暴露 editor 实例给外部（如 EditorToc）
  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady(editor ?? null);
    return () => {
      onEditorReady(null);
    };
  }, [editor, onEditorReady]);

  // 草稿恢复
  const { pendingDraft, restore, discard } = useDraftRestore({
    editor,
    draftId,
    serverUpdatedAt,
    enabled: !readOnly && !disableAutosave,
  });

  // 自动保存
  const autosave = useAutosave({
    editor,
    draftId,
    articleId,
    onRemoteSave: onSave,
    debounceMs: autosaveDebounceMs,
    intervalMs: autosaveIntervalMs,
    disabled: readOnly || disableAutosave,
  });

  return (
    <div className={className ? `doc-editor ${className}` : 'doc-editor'}>
      {!hideSaveStatus && !readOnly && !disableAutosave && (
        <SaveStatusIndicator
          status={autosave.status}
          lastRemoteSavedAt={autosave.lastRemoteSavedAt}
          lastLocalSavedAt={autosave.lastLocalSavedAt}
          lastError={autosave.lastError}
          isOffline={autosave.isOffline}
          onRetry={() => autosave.forceSave()}
        />
      )}
      <div className="doc-editor__body" style={{ position: 'relative' }}>
        <EditorContent editor={editor} />
        {editor && !readOnly && (
          <>
            <BubbleMenu editor={editor} />
            <FloatingMenu editor={editor} />
            <BlockHandle editor={editor} />
          </>
        )}
      </div>
      {!readOnly && !disableAutosave && (
        <DraftRestorePrompt draft={pendingDraft} onRestore={restore} onDiscard={discard} />
      )}
    </div>
  );
}
