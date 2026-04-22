/**
 * Autosave 模块 — IndexedDB 草稿 + 自动保存 + 草稿恢复 + 状态指示
 */

export {
  DraftRestorePrompt,
  type DraftRestorePromptProps,
} from './DraftRestorePrompt';
export {
  cleanupOld,
  clearAll,
  closeDB,
  DB_NAME,
  DB_VERSION,
  DEFAULT_MAX_DRAFTS,
  DEFAULT_RETENTION_DAYS,
  type Draft,
  deleteDraft,
  listDrafts,
  loadByArticleId,
  loadDraft,
  STORE_NAME,
  saveDraft,
} from './DraftStore';
export {
  SaveStatusIndicator,
  type SaveStatusIndicatorProps,
} from './SaveStatusIndicator';
export {
  type SaveStatus,
  type UseAutosaveOptions,
  type UseAutosaveResult,
  useAutosave,
} from './useAutosave';
export {
  type UseDraftRestoreOptions,
  type UseDraftRestoreResult,
  useDraftRestore,
} from './useDraftRestore';

export { useOnlineStatus } from './useOnlineStatus';
