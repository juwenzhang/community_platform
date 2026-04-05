import type { ArticleMeta, TocItem } from '@luhanxin/md-parser-core';
import {
  extractMeta,
  extractPlainText,
  extractToc,
  parseMarkdownToAst,
  renderMarkdown,
} from '@luhanxin/md-parser-core';
import { onMounted, type Ref, ref, watch } from 'vue';

export interface UseMarkdownResult {
  /** 渲染后的 HTML 字符串 */
  html: Ref<string>;
  /** 目录树 */
  toc: Ref<TocItem[]>;
  /** 文章元数据 */
  meta: Ref<ArticleMeta | null>;
  /** 纯文本（用于搜索） */
  plainText: Ref<string>;
  /** 是否正在解析 */
  loading: Ref<boolean>;
  /** 错误信息 */
  error: Ref<string | null>;
}

/**
 * Vue Composable: 解析和渲染 Markdown
 */
export function useMarkdown(content: Ref<string>): UseMarkdownResult {
  const html = ref('');
  const toc = ref<TocItem[]>([]);
  const meta = ref<ArticleMeta | null>(null);
  const plainText = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const parse = async () => {
    if (!content.value) {
      html.value = '';
      toc.value = [];
      meta.value = null;
      plainText.value = '';
      loading.value = false;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // 渲染 HTML
      html.value = await renderMarkdown(content.value);

      // 解析 AST
      const ast = await parseMarkdownToAst(content.value);

      // 提取 TOC
      toc.value = extractToc(ast);

      // 提取纯文本
      plainText.value = extractPlainText(ast);

      // 提取元数据
      meta.value = extractMeta(ast, plainText.value);
    } catch (err: any) {
      error.value = err.message || 'Failed to parse markdown';
    } finally {
      loading.value = false;
    }
  };

  onMounted(parse);
  watch(content, parse);

  return {
    html,
    toc,
    meta,
    plainText,
    loading,
    error,
  };
}
