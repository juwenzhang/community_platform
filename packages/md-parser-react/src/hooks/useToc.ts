import type { TocItem } from '@luhanxin/md-parser-core';
import { extractToc, parseMarkdownToAst } from '@luhanxin/md-parser-core';
import { useEffect, useState } from 'react';

/**
 * 独立 TOC 提取 Hook
 *
 * 当只需要 TOC（不需要完整渲染）时使用。
 * 比如侧边栏只需要目录数据。
 */
export function useToc(content: string): TocItem[] {
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    if (!content) {
      setToc([]);
      return;
    }

    let cancelled = false;

    parseMarkdownToAst(content).then((ast) => {
      if (!cancelled) {
        setToc(extractToc(ast));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [content]);

  return toc;
}
