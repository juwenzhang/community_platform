import type { TocItem } from '@luhanxin/md-parser-core';
import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue';

/**
 * 滚动感知 Composable
 *
 * IntersectionObserver 追踪可视标题，返回 activeId。
 */
export function useActiveHeading(
  containerRef: Ref<HTMLElement | null>,
  toc: Ref<TocItem[]>,
): Ref<string | null> {
  const activeId = ref<string | null>(null);
  let observer: IntersectionObserver | null = null;

  const setup = () => {
    cleanup();
    const container = containerRef.value;
    if (!container || toc.value.length === 0) return;

    const ids = flattenTocIds(toc.value);
    const headingEls = ids
      .map((id) => container.querySelector(`#${CSS.escape(id)}`))
      .filter(Boolean) as Element[];

    if (headingEls.length === 0) return;

    const visibleIds = new Set<string>();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visibleIds.add(id);
          else visibleIds.delete(id);
        }
        if (visibleIds.size > 0) {
          for (const el of headingEls) {
            if (visibleIds.has((el as HTMLElement).id)) {
              activeId.value = (el as HTMLElement).id;
              break;
            }
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    );

    for (const el of headingEls) observer.observe(el);
  };

  const cleanup = () => {
    observer?.disconnect();
    observer = null;
  };

  onMounted(setup);
  watch(toc, setup);
  onUnmounted(cleanup);

  return activeId;
}

function flattenTocIds(items: TocItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (item.children) ids.push(...flattenTocIds(item.children));
  }
  return ids;
}
