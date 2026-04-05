import type { ArticleMeta, ParseResult, TocItem } from '@luhanxin/md-parser-core';
import { getParseCache, renderMarkdown } from '@luhanxin/md-parser-core';
import { isRef, onMounted, type Ref, ref, watch } from 'vue';

export interface UseMarkdownResult {
  html: Ref<string>;
  toc: Ref<TocItem[]>;
  meta: Ref<ArticleMeta>;
  plainText: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  parseResult: Ref<ParseResult | null>;
}

export interface UseMarkdownOptions {
  debounce?: number;
  cache?: boolean;
}

/**
 * Vue Composable: 解析和渲染 Markdown
 *
 * 修复 GLM 版本的双重解析问题和 emit 返回值误用。
 * 接受 string | Ref<string>，内置 debounce + LRU 缓存。
 */
export function useMarkdown(
  content: string | Ref<string>,
  options: UseMarkdownOptions = {},
): UseMarkdownResult {
  const { debounce: debounceMs = 150, cache: useCache = true } = options;

  const html = ref('');
  const toc = ref<TocItem[]>([]);
  const meta = ref<ArticleMeta>({});
  const plainText = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const parseResult = ref<ParseResult | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const contentRef = isRef(content) ? content : ref(content);

  const parse = async () => {
    const md = contentRef.value;

    if (!md) {
      html.value = '';
      toc.value = [];
      meta.value = {};
      plainText.value = '';
      loading.value = false;
      error.value = null;
      parseResult.value = null;
      return;
    }

    // 检查缓存
    if (useCache) {
      const cached = getParseCache().get(md);
      if (cached) {
        html.value = cached.html;
        toc.value = cached.toc;
        meta.value = cached.meta;
        plainText.value = cached.plainText;
        parseResult.value = cached;
        loading.value = false;
        error.value = null;
        return;
      }
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await renderMarkdown(md);

      if (useCache) {
        getParseCache().set(md, undefined, result);
      }

      html.value = result.html;
      toc.value = result.toc;
      meta.value = result.meta;
      plainText.value = result.plainText;
      parseResult.value = result;
    } catch (err: any) {
      error.value = err.message || 'Failed to parse markdown';
    } finally {
      loading.value = false;
    }
  };

  const debouncedParse = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (debounceMs > 0) {
      debounceTimer = setTimeout(parse, debounceMs);
    } else {
      parse();
    }
  };

  onMounted(debouncedParse);
  watch(contentRef, debouncedParse);

  return { html, toc, meta, plainText, loading, error, parseResult };
}
