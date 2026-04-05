import type { ArticleMeta, ParseResult, TocItem } from '@luhanxin/md-parser-core';
import { getParseCache, renderMarkdown } from '@luhanxin/md-parser-core';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMarkdownOptions {
  /** 防抖延迟（ms，默认 150） */
  debounce?: number;
  /** 是否启用缓存（默认 true） */
  cache?: boolean;
}

export interface UseMarkdownResult {
  html: string;
  toc: TocItem[];
  meta: ArticleMeta;
  plainText: string;
  loading: boolean;
  error: string | null;
  /** 完整的 ParseResult（供渲染引擎使用） */
  parseResult: ParseResult | null;
}

/**
 * React Hook: 解析和渲染 Markdown
 *
 * 修复 GLM 版本的双重解析问题：现在一次 pipeline 完成，
 * 直接消费 core 的 ParseResult。
 *
 * 内置 debounce + LRU 缓存。
 */
export function useMarkdown(content: string, options: UseMarkdownOptions = {}): UseMarkdownResult {
  const { debounce: debounceMs = 150, cache: useCache = true } = options;

  const [result, setResult] = useState<UseMarkdownResult>({
    html: '',
    toc: [],
    meta: {},
    plainText: '',
    loading: false,
    error: null,
    parseResult: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const cancelledRef = useRef(false);

  const parse = useCallback(
    async (md: string) => {
      if (!md) {
        setResult({
          html: '',
          toc: [],
          meta: {},
          plainText: '',
          loading: false,
          error: null,
          parseResult: null,
        });
        return;
      }

      // 检查缓存
      if (useCache) {
        const cached = getParseCache().get(md);
        if (cached) {
          setResult({
            html: cached.html,
            toc: cached.toc,
            meta: cached.meta,
            plainText: cached.plainText,
            loading: false,
            error: null,
            parseResult: cached,
          });
          return;
        }
      }

      setResult((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const parseResult = await renderMarkdown(md);

        if (!cancelledRef.current) {
          // 写入缓存
          if (useCache) {
            getParseCache().set(md, undefined, parseResult);
          }

          setResult({
            html: parseResult.html,
            toc: parseResult.toc,
            meta: parseResult.meta,
            plainText: parseResult.plainText,
            loading: false,
            error: null,
            parseResult,
          });
        }
      } catch (err: any) {
        if (!cancelledRef.current) {
          setResult((prev) => ({
            ...prev,
            loading: false,
            error: err.message || 'Failed to parse markdown',
          }));
        }
      }
    },
    [useCache],
  );

  useEffect(() => {
    cancelledRef.current = false;

    if (debounceMs > 0) {
      debounceRef.current = setTimeout(() => parse(content), debounceMs);
    } else {
      parse(content);
    }

    return () => {
      cancelledRef.current = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content, debounceMs, parse]);

  return result;
}
