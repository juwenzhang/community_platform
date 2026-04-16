import type { EventHandlers } from '@luhanxin/md-parser-core';
import { onMounted, onUnmounted, type Ref } from 'vue';

/**
 * 事件代理 Composable
 *
 * 在容器 div 上通过事件委托捕获渲染后 DOM 的交互事件。
 */
export function useEventDelegation(
  containerRef: Ref<HTMLElement | null>,
  handlers: EventHandlers,
): void {
  let removeListener: (() => void) | null = null;

  const setup = () => {
    const container = containerRef.value;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const mentionEl = target.closest<HTMLAnchorElement>('a.mention[data-username]');
      if (mentionEl) {
        e.preventDefault();
        handlers.onMentionClick?.(mentionEl.dataset.username!);
        return;
      }

      const hashtagEl = target.closest<HTMLAnchorElement>('a.hashtag[data-tag]');
      if (hashtagEl) {
        e.preventDefault();
        handlers.onHashtagClick?.(hashtagEl.dataset.tag!);
        return;
      }

      const copyBtn = target.closest<HTMLButtonElement>('button.code-block-copy[data-code]');
      if (copyBtn) {
        e.preventDefault();
        const code = copyBtn.dataset.code || '';
        const lang = copyBtn.closest<HTMLElement>('.code-block-wrapper')?.dataset.lang || '';
        navigator.clipboard.writeText(code).catch(() => {});
        handlers.onCodeCopy?.(code, lang);
        return;
      }

      const anchorEl = target.closest<HTMLAnchorElement>('a.heading-anchor');
      if (anchorEl) {
        const headingEl = anchorEl.parentElement;
        if (headingEl?.id) {
          const level = Number.parseInt(headingEl.tagName.replace('H', ''), 10);
          handlers.onHeadingClick?.(headingEl.id, level);
        }
        return;
      }

      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        handlers.onImageClick?.(img.src, img.alt || '');
        return;
      }

      const linkEl = target.closest<HTMLAnchorElement>('a[href]');
      if (
        linkEl &&
        !linkEl.classList.contains('mention') &&
        !linkEl.classList.contains('hashtag') &&
        !linkEl.classList.contains('heading-anchor')
      ) {
        handlers.onLinkClick?.(linkEl.href);
      }
    };

    container.addEventListener('click', handleClick);
    removeListener = () => container.removeEventListener('click', handleClick);
  };

  onMounted(setup);
  onUnmounted(() => removeListener?.());
}
