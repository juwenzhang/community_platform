/**
 * 草稿恢复弹窗
 *
 * 编辑器挂载时若检测到本地草稿 `updatedAt > 服务端 updatedAt`，
 * 展示这个对话框让用户决定：
 *   - 恢复：setContent(localDraft.contentJson)
 *   - 放弃：删除本地草稿
 *
 * 纯 UI 组件，不内置逻辑 —— useDraftRestore Hook 负责检查 + 触发。
 */

import type { ReactNode } from 'react';
import type { Draft } from './DraftStore';

export interface DraftRestorePromptProps {
  /** 本地草稿（null 则不展示） */
  draft: Draft | null;
  /** 恢复：用 draft.contentJson 替换当前编辑器内容 */
  onRestore: () => void;
  /** 放弃：删除本地草稿，保留服务端版本 */
  onDiscard: () => void;
  /** 自定义标题 */
  title?: string;
  /** 自定义描述（接收草稿时间字符串） */
  renderDescription?: (draft: Draft) => ReactNode;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export function DraftRestorePrompt({
  draft,
  onRestore,
  onDiscard,
  title = '检测到本地草稿',
  renderDescription,
}: DraftRestorePromptProps) {
  if (!draft) return null;

  const description = renderDescription ? (
    renderDescription(draft)
  ) : (
    <>
      本地有一份 <strong>{formatRelative(draft.updatedAt)}</strong> 保存的未同步内容。
      <br />
      是否恢复这份草稿？如果放弃，将使用服务端最新版本。
    </>
  );

  return (
    <div className="doc-editor-draft-prompt" role="dialog" aria-modal="true">
      <div className="doc-editor-draft-prompt__overlay" />
      <div className="doc-editor-draft-prompt__content">
        <h3 className="doc-editor-draft-prompt__title">{title}</h3>
        <p className="doc-editor-draft-prompt__description">{description}</p>
        <div className="doc-editor-draft-prompt__actions">
          <button type="button" className="doc-editor-draft-prompt__button" onClick={onDiscard}>
            放弃本地草稿
          </button>
          <button
            type="button"
            className="doc-editor-draft-prompt__button doc-editor-draft-prompt__button--primary"
            onClick={onRestore}
          >
            恢复本地草稿
          </button>
        </div>
      </div>
    </div>
  );
}
