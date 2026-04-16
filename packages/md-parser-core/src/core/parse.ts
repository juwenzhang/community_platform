import type { Root } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export interface ParseOptions {
  /** 是否启用 GFM 语法 */
  gfm?: boolean;
  /** 是否启用数学公式 */
  math?: boolean;
  /** 是否解析 frontmatter */
  frontmatter?: boolean;
}

/**
 * 解析 Markdown 文本为 mdast AST
 */
export async function parseMarkdownToAst(
  markdown: string,
  options: ParseOptions = {},
): Promise<Root> {
  const { gfm = true, math = true, frontmatter = true } = options;

  const processor = unified().use(remarkParse);

  // 添加 GFM 支持
  if (gfm) {
    processor.use(remarkGfm);
  }

  // 添加数学公式支持
  if (math) {
    processor.use(remarkMath);
  }

  // 添加 frontmatter 支持
  if (frontmatter) {
    processor.use(remarkFrontmatter, ['yaml']);
  }

  const ast = processor.parse(markdown);
  return ast as Root;
}
