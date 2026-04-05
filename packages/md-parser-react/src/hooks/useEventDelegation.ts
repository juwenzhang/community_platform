import type { EventHandlers } from '@luhanxin/md-parser-core';
import { useEffect } from 'react';

/**
 * 事件代理 Hook
 *
 * 在容器 div 上通过事件委托（单一 click listener）
 * 捕获渲染后 DOM 中的交互事件。
 *
 * 根据 data-* 属性和 CSS class 分发到对应回调：
 * - a.mention[data-username] → onMentionClick
 * - a.hashtag[data-tag] → onHashtagClick
 * - img → onImageClick
 * - a[href] → onLinkClick
 * - button.code-block-copy[data-code] → onCodeCopy
 * - a.heading-anchor → onHeadingClick
 */
export function useEventDelegation(
  containerRef: React.RefObject<HTMLElement | null>,
  handlers: EventHandlers,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // @mention 点击
      const mentionEl = target.closest<HTMLAnchorElement>('a.mention[data-username]');
      if (mentionEl) {
        e.preventDefault();
        handlers.onMentionClick?.(mentionEl.dataset.username!);
        return;
      }

      // #hashtag 点击
      const hashtagEl = target.closest<HTMLAnchorElement>('a.hashtag[data-tag]');
      if (hashtagEl) {
        e.preventDefault();
        handlers.onHashtagClick?.(hashtagEl.dataset.tag!);
        return;
      }

      // 代码块复制按钮
      const copyBtn = target.closest<HTMLButtonElement>('button.code-block-copy[data-code]');
      if (copyBtn) {
        e.preventDefault();
        const code = copyBtn.dataset.code || '';
        const lang = copyBtn.closest<HTMLElement>('.code-block-wrapper')?.dataset.lang || '';
        navigator.clipboard.writeText(code).catch(() => {});
        handlers.onCodeCopy?.(code, lang);
        return;
      }

      // 标题锚点点击
      const anchorEl = target.closest<HTMLAnchorElement>('a.heading-anchor');
      if (anchorEl) {
        const headingEl = anchorEl.parentElement;
        if (headingEl?.id) {
          const level = Number.parseInt(headingEl.tagName.replace('H', ''), 10);
          handlers.onHeadingClick?.(headingEl.id, level);
        }
        return;
      }

      // 图片点击
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        handlers.onImageClick?.(img.src, img.alt || '');
        return;
      }

      // 普通链接点击（排除 mention/hashtag/anchor）
      const linkEl = target.closest<HTMLAnchorElement>('a[href]');
      if (
        linkEl &&
        !linkEl.classList.contains('mention') &&
        !linkEl.classList.contains('hashtag') &&
        !linkEl.classList.contains('heading-anchor')
      ) {
        handlers.onLinkClick?.(linkEl.href);
        return;
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, handlers]);
}
