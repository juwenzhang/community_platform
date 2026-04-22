/**
 * useAutosave Hook
 *
 * 两级自动保存：
 *   - 本地（IndexedDB）：每次编辑防抖 800ms 写一次
 *   - 远程（调用方注入的 onRemoteSave）：
 *       - 定时：每 intervalMs（默认 30s）写一次（若有脏数据）
 *       - 立即：消费方调 forceSave()
 *
 * 离线处理：
 *   - `navigator.onLine === false` 时跳过 remote save
 *   - 监听 `online` 事件：网络恢复立刻触发一次 forceSave
 *
 * 冲突处理：
 *   - 由调用方的 onRemoteSave 决定（返回 Promise，reject 时状态转为 'error'）
 *
 * 状态机：
 *   idle → saving-local → saved-local → saving-remote → saved-remote
 *                                                    ↘ error
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { jsonToMarkdown } from '../convert';
import type { ProseMirrorJSON } from '../types/editor';
import { saveDraft } from './DraftStore';

export type SaveStatus =
  | 'idle'
  | 'saving-local'
  | 'saved-local'
  | 'saving-remote'
  | 'saved-remote'
  | 'error'
  | 'offline';

export interface UseAutosaveOptions {
  /** 编辑器实例（可能为 null，挂载中） */
  editor: Editor | null;
  /**
   * 草稿 ID — 用于 IndexedDB 索引
   * - 编辑现有文章：传 articleId
   * - 新建文章：生成并保持一致的临时 uuid
   */
  draftId: string;
  /** 关联文章 ID（新建时为 null） */
  articleId: string | null;
  /**
   * 远程保存函数 — 由消费方实现（例如调用 Connect RPC）
   * 返回 Promise，resolve 表示成功，reject 进入 error 状态
   * 不传 = 只做本地保存
   */
  onRemoteSave?: (markdown: string, json: ProseMirrorJSON) => Promise<void>;
  /** 本地防抖延时，默认 800ms */
  debounceMs?: number;
  /** 远程保存间隔，默认 30000ms (30s) */
  intervalMs?: number;
  /** 开关：禁用整个 autosave（仅展示只读时用） */
  disabled?: boolean;
}

export interface UseAutosaveResult {
  /** 当前保存状态 */
  status: SaveStatus;
  /** 最近一次远程保存成功的时间戳（ms） */
  lastRemoteSavedAt: number | null;
  /** 最近一次本地保存成功的时间戳（ms） */
  lastLocalSavedAt: number | null;
  /** 最近一次错误对象（error 状态时可读） */
  lastError: Error | null;
  /** 立即触发一次本地 + 远程保存 */
  forceSave: () => Promise<void>;
  /** 是否有未远程保存的改动 */
  isDirty: boolean;
  /** 当前是否离线 */
  isOffline: boolean;
}

export function useAutosave({
  editor,
  draftId,
  articleId,
  onRemoteSave,
  debounceMs = 800,
  intervalMs = 30_000,
  disabled = false,
}: UseAutosaveOptions): UseAutosaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastLocalSavedAt, setLastLocalSavedAt] = useState<number | null>(null);
  const [lastRemoteSavedAt, setLastRemoteSavedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const dirtyRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 从 editor 提取当前 JSON */
  const readSnapshot = useCallback((): { json: ProseMirrorJSON; markdown: string } | null => {
    if (!editor) return null;
    const json = editor.getJSON() as unknown as ProseMirrorJSON;
    const markdown = jsonToMarkdown(json);
    return { json, markdown };
  }, [editor]);

  /** 写 IndexedDB */
  const saveLocal = useCallback(async (): Promise<void> => {
    const snapshot = readSnapshot();
    if (!snapshot) return;
    setStatus('saving-local');
    try {
      await saveDraft({
        id: draftId,
        articleId,
        contentJson: snapshot.json,
        contentMarkdown: snapshot.markdown,
      });
      setLastLocalSavedAt(Date.now());
      setStatus('saved-local');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLastError(error);
      setStatus('error');
      console.error('[doc-editor] 本地保存失败:', error);
    }
  }, [draftId, articleId, readSnapshot]);

  /** 调用远程保存 */
  const saveRemote = useCallback(async (): Promise<void> => {
    if (!onRemoteSave) return;
    if (isOffline) {
      setStatus('offline');
      return;
    }
    const snapshot = readSnapshot();
    if (!snapshot) return;

    setStatus('saving-remote');
    try {
      await onRemoteSave(snapshot.markdown, snapshot.json);
      dirtyRef.current = false;
      setLastRemoteSavedAt(Date.now());
      setStatus('saved-remote');
      setLastError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLastError(error);
      setStatus('error');
      console.error('[doc-editor] 远程保存失败:', error);
    }
  }, [onRemoteSave, isOffline, readSnapshot]);

  /** 立即保存（本地 + 远程） */
  const forceSave = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    await saveLocal();
    await saveRemote();
  }, [saveLocal, saveRemote]);

  // ── 监听 editor update，触发防抖本地保存 ──
  useEffect(() => {
    if (!editor || disabled) return;
    const onUpdate = () => {
      dirtyRef.current = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void saveLocal();
      }, debounceMs);
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [editor, saveLocal, debounceMs, disabled]);

  // ── 定时远程保存 ──
  useEffect(() => {
    if (disabled || !onRemoteSave) return;
    intervalTimerRef.current = setInterval(() => {
      if (dirtyRef.current && !isOffline) {
        void saveRemote();
      }
    }, intervalMs);
    return () => {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    };
  }, [saveRemote, onRemoteSave, intervalMs, disabled, isOffline]);

  // ── 网络状态监听 ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      setIsOffline(false);
      // 网络恢复立即尝试保存
      if (dirtyRef.current && onRemoteSave) {
        void saveRemote();
      }
    };
    const onOffline = () => {
      setIsOffline(true);
      setStatus('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [saveRemote, onRemoteSave]);

  // ── 页面关闭前强制保存（防止用户丢失内容） ──
  useEffect(() => {
    if (disabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        // 同步写本地（navigator.sendBeacon 等异步操作不可靠），但本地 idb 同步
        // 只能发起请求，不能等待；仅提示用户
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [disabled]);

  return {
    status,
    lastLocalSavedAt,
    lastRemoteSavedAt,
    lastError,
    forceSave,
    isDirty: dirtyRef.current,
    isOffline,
  };
}
