import type { ArticleMeta, EventHandlers, TocItem } from '@luhanxin/md-parser-core';
import React, { useRef } from 'react';
import { useMarkdownContext } from './context/MarkdownProvider';
import { useEventDelegation } from './hooks/useEventDelegation';
import { useMarkdown } from './hooks/useMarkdown';

export interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** 自定义类名 */
  className?: string;
  /** TOC 提取完成回调 */
  onTocReady?: (toc: TocItem[]) => void;
  /** 元数据提取完成回调 */
  onMetaReady?: (meta: ArticleMeta) => void;
  /** 事件回调（覆盖 Provider 中的配置） */
  eventHandlers?: EventHandlers;
  /** 防抖延迟（ms，默认 150） */
  debounce?: number;
}

/**
 * React Markdown 渲染组件
 *
 * 职责清晰：只负责渲染 + 事件代理，不包含编辑器功能。
 * （GLM 版本违反 Spec Non-goals 塞了图片上传/水印功能，已全部移除）
 *
 * 通过 MarkdownProvider 可共享全局主题/事件/组件配置。
 */
export function MarkdownRenderer({
  content,
  className,
  onTocReady,
  onMetaReady,
  eventHandlers,
  debounce,
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctx = useMarkdownContext();

  const { html, toc, meta, loading, error } = useMarkdown(content, { debounce });

  // 合并 Provider 和 props 的事件回调
  const mergedHandlers: EventHandlers = {
    ...ctx.eventHandlers,
    ...eventHandlers,
  };

  // 事件代理
  useEventDelegation(containerRef, mergedHandlers);

  // TOC / Meta 回调
  React.useEffect(() => {
    if (toc.length > 0) onTocReady?.(toc);
  }, [toc, onTocReady]);

  React.useEffect(() => {
    if (meta && Object.keys(meta).length > 0) onMetaReady?.(meta);
  }, [meta, onMetaReady]);

  if (loading) {
    return <div className="markdown-skeleton">Loading...</div>;
  }

  if (error) {
    return <div className="markdown-error">{error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className || ''}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML 已通过 rehype-sanitize 清理
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
