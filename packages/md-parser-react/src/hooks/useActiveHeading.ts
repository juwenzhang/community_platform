import type { TocItem } from '@luhanxin/md-parser-core';
import { useEffect, useRef, useState } from 'react';

/**
 * 滚动感知 Hook
 *
 * 使用 IntersectionObserver 追踪容器内所有带 id 的标题元素，
 * 返回当前可视区域最靠近顶部的标题 id。
 *
 * 用于 TOC 侧边栏高亮跟随。
 */
export function useActiveHeading(
  containerRef: React.RefObject<HTMLElement | null>,
  toc: TocItem[],
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || toc.length === 0) return;

    // 收集所有标题元素
    const headingEls = toc
      .flatMap((item) => {
        const ids = [item.id, ...(item.children?.map((c) => c.id) ?? [])];
        return ids;
      })
      .map((id) => container.querySelector(`#${CSS.escape(id)}`))
      .filter(Boolean) as Element[];

    if (headingEls.length === 0) return;

    const visibleIds = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) {
            visibleIds.add(id);
          } else {
            visibleIds.delete(id);
          }
        }

        // 取最靠近顶部的可见标题
        if (visibleIds.size > 0) {
          for (const el of headingEls) {
            if (visibleIds.has((el as HTMLElement).id)) {
              setActiveId((el as HTMLElement).id);
              break;
            }
          }
        }
      },
      {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      },
    );

    for (const el of headingEls) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [containerRef, toc]);

  return activeId;
}
