import yaml from 'js-yaml';
import type { Code, Heading, Root, YAML } from 'mdast';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import {
  customHandlers,
  rehypeCodeMeta,
  rehypeExternalLinks,
  rehypeHeadingIds,
  rehypeLazyImages,
  remarkContainer,
  remarkHashtag,
  remarkMention,
} from '../plugins';
import { customSanitizeSchema } from '../sanitize/schema';
import type { ArticleMeta } from '../types/meta';
import type { BlockNode, ParseResult } from '../types/result';
import type { TocItem } from '../types/toc';
import { highlightCode } from './highlight';

export interface RenderOptions {
  /** 是否启用 GFM 语法（默认 true） */
  gfm?: boolean;
  /** 是否启用数学公式（默认 true） */
  math?: boolean;
  /** 是否解析 frontmatter（默认 true） */
  frontmatter?: boolean;
  /** 是否启用 XSS 防护（默认 true） */
  sanitize?: boolean;
  /** 是否启用代码高亮（默认 true） */
  highlight?: boolean;
  /** 代码高亮主题 */
  highlightTheme?: {
    dark?: string;
    light?: string;
  };
  /** 是否启用自定义语法（默认 true） */
  customSyntax?: boolean;
  /** 是否启用渲染后处理插件（默认 true） */
  postProcess?: boolean;
  /** 外链白名单域名 */
  internalDomains?: string[];
}

/**
 * Shiki 代码高亮 remark 插件
 *
 * 在 remark 阶段并发高亮所有代码块，将 code 节点替换为 html 节点。
 */
function remarkShiki(options: { theme?: { dark?: string; light?: string } } = {}) {
  return async (tree: Root) => {
    const codeNodes: Code[] = [];
    visit(tree, 'code', (node: Code) => {
      codeNodes.push(node);
    });

    await Promise.all(
      codeNodes.map(async (node) => {
        if (node.lang) {
          try {
            const html = await highlightCode(node.value, {
              lang: node.lang,
              theme: options.theme,
            });
            (node as any).type = 'html';
            (node as any).value = html;
          } catch (error) {
            // Shiki 高亮失败时保持原始代码块
          }
        }
      }),
    );
  };
}

/**
 * remark 插件：在 pipeline 中提取 TOC、元数据、纯文本
 *
 * 通过 vfile.data 传递提取结果，避免二次解析。
 */
function remarkExtractAll() {
  return (tree: Root, file: any) => {
    const toc: TocItem[] = [];
    const textSegments: string[] = [];
    const meta: ArticleMeta = {};
    const slugCounts = new Map<string, number>();

    // 提取 frontmatter
    visit(tree, 'yaml', (node: YAML) => {
      try {
        const frontmatter = yaml.load(node.value) as Record<string, any>;
        if (frontmatter.title) meta.title = frontmatter.title;
        if (frontmatter.description) meta.description = frontmatter.description;
        if (frontmatter.tags) meta.tags = frontmatter.tags;
        if (frontmatter.date) meta.date = frontmatter.date;
      } catch {
        // frontmatter 解析失败，忽略
      }
    });

    // 提取标题（TOC）
    visit(tree, 'heading', (node: Heading) => {
      let text = '';
      visit(node, 'text', (child) => {
        text += child.value;
      });
      text = text.trim();
      if (!text) return;

      // 生成 slug
      let slug =
        text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
          .replace(/^-|-$/g, '') || 'heading';

      const count = slugCounts.get(slug) || 0;
      if (count > 0) slug = `${slug}-${count}`;
      slugCounts.set(slug, count + 1);

      toc.push({ text, id: slug, level: node.depth });

      // 如果 frontmatter 没有标题，用第一个 h1
      if (!meta.title && node.depth === 1) {
        meta.title = text;
      }
    });

    // 提取纯文本
    visit(tree, (node: any) => {
      if (node.type === 'text') {
        textSegments.push(node.value);
      }
    });

    const plainText = textSegments.join(' ').replace(/\s+/g, ' ').trim();

    // 统计字数和阅读时间
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = plainText
      .replace(/[\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    meta.wordCount = chineseChars + englishWords;
    meta.readingTime = Math.ceil(meta.wordCount / 200);

    // 通过 vfile.data 传递提取结果
    file.data.toc = buildTocTree(toc);
    file.data.meta = meta;
    file.data.plainText = plainText;
  };
}

/**
 * remark 插件：提取 block 分块信息
 *
 * 将顶层 AST 节点按块级元素分割为 BlockNode 列表。
 */
function remarkExtractBlocks() {
  return (tree: Root, file: any) => {
    const blocks: BlockNode[] = [];

    for (const node of tree.children) {
      const startLine = node.position?.start?.line ?? 0;
      const endLine = node.position?.end?.line ?? 0;

      let type: BlockNode['type'] = 'paragraph';
      switch (node.type) {
        case 'heading':
          type = 'heading';
          break;
        case 'code':
          type = 'code';
          break;
        case 'table':
          type = 'table';
          break;
        case 'list':
          type = 'list';
          break;
        case 'blockquote':
          type = 'blockquote';
          break;
        case 'thematicBreak':
          type = 'thematicBreak';
          break;
        case 'html':
          type = 'html';
          break;
        case 'math':
          type = 'math';
          break;
        case 'container' as any:
          type = 'container';
          break;
        default:
          type = 'paragraph';
      }

      // 预估高度（px）
      const lineCount = Math.max(endLine - startLine + 1, 1);
      const estimatedHeight = estimateBlockHeight(type, lineCount);

      blocks.push({
        type,
        html: '', // 在 rehype 阶段填充
        startLine,
        endLine,
        estimatedHeight,
      });
    }

    file.data.blocks = blocks;
  };
}

/**
 * 渲染 Markdown 为 ParseResult
 *
 * 一次 unified pipeline 完成：
 * 1. remark 阶段：解析 + GFM + math + frontmatter + 自定义语法 + Shiki 高亮 + 提取 TOC/meta/plainText/blocks
 * 2. remark-rehype 阶段：mdast → hast（通过 customHandlers 处理自定义节点）
 * 3. rehype 阶段：标题锚点 + 外链处理 + 图片懒加载 + 代码块增强 + KaTeX + XSS 防护
 * 4. rehype-stringify 阶段：hast → HTML string
 */
export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<ParseResult> {
  const {
    gfm = true,
    math = true,
    frontmatter = true,
    sanitize = true,
    highlight = true,
    highlightTheme,
    customSyntax = true,
    postProcess = true,
    internalDomains,
  } = options;

  const processor = unified().use(remarkParse);

  // remark 阶段
  if (gfm) processor.use(remarkGfm);
  if (math) processor.use(remarkMath);
  if (frontmatter) processor.use(remarkFrontmatter, ['yaml']);

  // 自定义语法插件（只产出 mdast 节点）
  if (customSyntax) {
    processor.use(remarkMention);
    processor.use(remarkHashtag);
    processor.use(remarkContainer);
  }

  // Shiki 代码高亮
  if (highlight) {
    processor.use(remarkShiki, { theme: highlightTheme });
  }

  // 一次性提取 TOC / meta / plainText / blocks
  processor.use(remarkExtractAll);
  processor.use(remarkExtractBlocks);

  // remark-rehype 转换（通过 handlers 处理自定义节点）
  processor.use(remarkRehype, {
    allowDangerousHtml: true,
    ...(customSyntax ? { handlers: customHandlers } : {}),
  });

  // 解析嵌入的 HTML
  processor.use(rehypeRaw);

  // rehype 渲染后处理插件
  if (postProcess) {
    processor.use(rehypeHeadingIds);
    processor.use(rehypeExternalLinks, { internalDomains });
    processor.use(rehypeLazyImages);
    processor.use(rehypeCodeMeta);
  }

  // KaTeX 数学公式
  if (math) processor.use(rehypeKatex);

  // XSS 防护
  if (sanitize) processor.use(rehypeSanitize, customSanitizeSchema);

  // HTML 输出
  processor.use(rehypeStringify);

  // 执行 pipeline
  const file = await processor.process(markdown);
  const html = String(file);

  return {
    html,
    toc: (file.data.toc as TocItem[]) || [],
    meta: (file.data.meta as ArticleMeta) || {},
    plainText: (file.data.plainText as string) || '',
    blocks: (file.data.blocks as BlockNode[]) || [],
  };
}

/**
 * 便利方法：渲染 Markdown 为纯 HTML 字符串
 *
 * 向后兼容，返回类型为 string 而非 ParseResult。
 */
export async function renderMarkdownToHtml(
  markdown: string,
  options: RenderOptions = {},
): Promise<string> {
  const result = await renderMarkdown(markdown, options);
  return result.html;
}

// ─── 工具函数 ────────────────────────────────────────────

/**
 * 构建嵌套 TOC 树
 */
function buildTocTree(headings: TocItem[]): TocItem[] {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(heading);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) parent.children = [];
      parent.children.push(heading);
    }

    stack.push(heading);
  }

  return root;
}

/**
 * 预估 block 渲染高度（px）
 */
function estimateBlockHeight(type: BlockNode['type'], lineCount: number): number {
  const LINE_HEIGHT = 24;
  const PADDING = 16;

  switch (type) {
    case 'heading':
      return 48 + PADDING;
    case 'code':
      return lineCount * 20 + 32 + PADDING; // 代码行高 20px + padding
    case 'table':
      return lineCount * 36 + PADDING; // 表格行高 36px
    case 'container':
      return lineCount * LINE_HEIGHT + 48 + PADDING; // 容器有标题 + padding
    case 'thematicBreak':
      return 24 + PADDING;
    default:
      return lineCount * LINE_HEIGHT + PADDING;
  }
}
