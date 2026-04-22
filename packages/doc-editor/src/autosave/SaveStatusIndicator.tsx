/**
 * 保存状态指示器
 *
 * 消费 useAutosave 的返回值，展示当前状态文案。
 * 纯展示组件，样式通过 className hook 由使用方覆盖。
 */

import type { SaveStatus } from './useAutosave';

export interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastRemoteSavedAt: number | null;
  lastLocalSavedAt: number | null;
  lastError: Error | null;
  isOffline?: boolean;
  /** 错误态点击重试回调 */
  onRetry?: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function SaveStatusIndicator({
  status,
  lastRemoteSavedAt,
  lastLocalSavedAt,
  lastError,
  isOffline,
  onRetry,
}: SaveStatusIndicatorProps) {
  let text: string;
  let modifier = '';

  if (isOffline && status === 'offline') {
    text = '离线：内容仅保存到本地';
    modifier = 'doc-editor-save-status--offline';
  } else {
    switch (status) {
      case 'idle':
        text = lastRemoteSavedAt ? `已同步 · ${formatTime(lastRemoteSavedAt)}` : '未保存';
        break;
      case 'saving-local':
        text = '正在保存到本地...';
        modifier = 'doc-editor-save-status--saving';
        break;
      case 'saved-local':
        text = lastLocalSavedAt ? `已保存到本地 · ${formatTime(lastLocalSavedAt)}` : '已保存到本地';
        break;
      case 'saving-remote':
        text = '正在同步...';
        modifier = 'doc-editor-save-status--saving';
        break;
      case 'saved-remote':
        text = lastRemoteSavedAt ? `已同步 · ${formatTime(lastRemoteSavedAt)}` : '已同步';
        modifier = 'doc-editor-save-status--success';
        break;
      case 'offline':
        text = '离线：内容仅保存到本地';
        modifier = 'doc-editor-save-status--offline';
        break;
      case 'error':
        text = `保存失败${lastError ? `：${lastError.message}` : ''}`;
        modifier = 'doc-editor-save-status--error';
        break;
      default:
        text = '';
    }
  }

  return (
    <div
      className={`doc-editor-save-status${modifier ? ` ${modifier}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="doc-editor-save-status__text">{text}</span>
      {status === 'error' && onRetry && (
        <button type="button" className="doc-editor-save-status__retry" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}
