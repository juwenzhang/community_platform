import type { TocItem } from '@luhanxin/md-parser-core';
import { extractToc, parseMarkdownToAst } from '@luhanxin/md-parser-core';
import { onMounted, type Ref, ref, watch } from 'vue';

/**
 * 独立 TOC 提取 Composable
 */
export function useToc(content: Ref<string>): Ref<TocItem[]> {
  const toc = ref<TocItem[]>([]);

  const extract = async () => {
    if (!content.value) {
      toc.value = [];
      return;
    }
    const ast = await parseMarkdownToAst(content.value);
    toc.value = extractToc(ast);
  };

  onMounted(extract);
  watch(content, extract);

  return toc;
}
