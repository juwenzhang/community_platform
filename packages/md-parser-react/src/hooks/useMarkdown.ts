import type { ArticleMeta, TocItem } from '@luhanxin/md-parser-core';
import {
  extractMeta,
  extractPlainText,
  extractToc,
  renderMarkdown,
} from '@luhanxin/md-parser-core';
import { useEffect, useState } from 'react';

export interface UseMarkdownResult {
  /** 渲染后的 HTML 字符串 */
  html: string;
  /** 目录树 */
  toc: TocItem[];
  /** 文章元数据 */
  meta: ArticleMeta | null;
  /** 纯文本（用于搜索） */
  plainText: string;
  /** 是否正在解析 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * React Hook: 解析和渲染 Markdown
 */
export function useMarkdown(content: string): UseMarkdownResult {
  const [result, setResult] = useState<UseMarkdownResult>({
    html: '',
    toc: [],
    meta: null,
    plainText: '',
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!content) {
      setResult({
        html: '',
        toc: [],
        meta: null,
        plainText: '',
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const parse = async () => {
      setResult((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // 渲染 HTML
        const html = await renderMarkdown(content);

        // 提取 TOC
        const { parseMarkdownToAst } = await import('@luhanxin/md-parser-core');
        const ast = await parseMarkdownToAst(content);
        const toc = extractToc(ast);

        // 提取纯文本
        const plainText = extractPlainText(ast);

        // 提取元数据
        const meta = extractMeta(ast, plainText);

        if (!cancelled) {
          setResult({
            html,
            toc,
            meta,
            plainText,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setResult({
            html: '',
            toc: [],
            meta: null,
            plainText: '',
            loading: false,
            error: err.message || 'Failed to parse markdown',
          });
        }
      }
    };

    parse();

    return () => {
      cancelled = true;
    };
  }, [content]);

  return result;
}
