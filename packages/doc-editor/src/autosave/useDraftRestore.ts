/**
 * useDraftRestore Hook
 *
 * 编辑器挂载时检查 IndexedDB 中是否有「比服务端版本更新」的本地草稿。
 *
 * 使用方式：
 *   const { pendingDraft, restore, discard } = useDraftRestore({
 *     editor, draftId, serverUpdatedAt
 *   });
 *   {pendingDraft && (
 *     <DraftRestorePrompt
 *       draft={pendingDraft}
 *       onRestore={restore}
 *       onDiscard={discard}
 *     />
 *   )}
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useState } from 'react';
import { type Draft, deleteDraft, loadDraft } from './DraftStore';

export interface UseDraftRestoreOptions {
  /** 编辑器实例 */
  editor: Editor | null;
  /** 草稿 ID（同 useAutosave 的 draftId） */
  draftId: string;
  /**
   * 服务端版本的 updatedAt（毫秒时间戳）
   * - undefined：视为新建，直接忽略本地草稿（避免覆盖空页面）
   * - null：服务端无版本（新建时可传 0）
   */
  serverUpdatedAt?: number | null;
  /** 仅在 draft.updatedAt 比服务端新多少毫秒时才提示（防止毫秒级误差），默认 1000 */
  thresholdMs?: number;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

export interface UseDraftRestoreResult {
  /** 待决定的本地草稿（比服务端新） */
  pendingDraft: Draft | null;
  /** 恢复：把 draft.contentJson 写入编辑器 */
  restore: () => void;
  /** 放弃：删除本地草稿 */
  discard: () => void;
  /** 是否正在检查中 */
  checking: boolean;
}

export function useDraftRestore({
  editor,
  draftId,
  serverUpdatedAt,
  thresholdMs = 1000,
  enabled = true,
}: UseDraftRestoreOptions): UseDraftRestoreResult {
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled || !editor || !draftId) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    loadDraft(draftId)
      .then((draft) => {
        if (cancelled) return;
        if (!draft) {
          setPendingDraft(null);
          return;
        }
        // 新建场景（serverUpdatedAt 为 undefined）：跳过恢复以免误覆盖
        if (serverUpdatedAt == null) {
          setPendingDraft(null);
          return;
        }
        if (draft.updatedAt > serverUpdatedAt + thresholdMs) {
          setPendingDraft(draft);
        } else {
          setPendingDraft(null);
        }
      })
      .catch((err) => {
        console.error('[doc-editor] 读取本地草稿失败:', err);
        setPendingDraft(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, editor, draftId, serverUpdatedAt, thresholdMs]);

  const restore = useCallback(() => {
    if (!editor || !pendingDraft) return;
    // biome-ignore lint/suspicious/noExplicitAny: ProseMirrorJSON 兼容 TipTap JSONContent
    editor.commands.setContent(pendingDraft.contentJson as any, true);
    setPendingDraft(null);
  }, [editor, pendingDraft]);

  const discard = useCallback(() => {
    if (!pendingDraft) return;
    void deleteDraft(pendingDraft.id);
    setPendingDraft(null);
  }, [pendingDraft]);

  return { pendingDraft, restore, discard, checking };
}
