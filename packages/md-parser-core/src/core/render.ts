import type { Code, Root } from 'mdast';
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
import { remarkContainer, remarkHashtag, remarkMention } from '../plugins';
import { customSanitizeSchema } from '../sanitize/schema';
import { highlightCode } from './highlight';

export interface RenderOptions {
  /** 是否启用 GFM 语法 */
  gfm?: boolean;
  /** 是否启用数学公式 */
  math?: boolean;
  /** 是否解析 frontmatter */
  frontmatter?: boolean;
  /** 是否启用 XSS 防护 */
  sanitize?: boolean;
  /** 是否启用代码高亮 */
  highlight?: boolean;
  /** 代码高亮主题 */
  highlightTheme?: {
    dark?: string;
    light?: string;
  };
  /** 是否启用自定义语法 */
  customSyntax?: boolean;
}

/**
 * Shiki 代码高亮插件（remark）
 */
function remarkShiki(options: { theme?: { dark?: string; light?: string } } = {}) {
  return async (tree: Root) => {
    const codeNodes: Code[] = [];

    // 收集所有代码块
    visit(tree, 'code', (node: Code) => {
      codeNodes.push(node);
    });

    // 并发高亮所有代码块
    await Promise.all(
      codeNodes.map(async (node) => {
        if (node.lang) {
          try {
            const html = await highlightCode(node.value, {
              lang: node.lang,
              theme: options.theme,
            });
            // 将代码块替换为 HTML 节点
            node.type = 'html' as any;
            (node as any).value = html;
          } catch (error) {
            console.warn(`Failed to highlight code block with lang ${node.lang}:`, error);
          }
        }
      }),
    );
  };
}

/**
 * 将自定义节点转换为 HTML 的 rehype 插件
 */
function rehypeCustomNodes() {
  return (tree: any) => {
    visit(tree, 'mention' as any, (node: any) => {
      node.type = 'element';
      node.tagName = 'a';
      node.properties = {
        href: `/user/${node.username}`,
        className: ['mention'],
        'data-username': node.username,
      };
      node.children = [{ type: 'text', value: `@${node.username}` }];
    });

    visit(tree, 'hashtag' as any, (node: any) => {
      node.type = 'element';
      node.tagName = 'a';
      node.properties = {
        href: `/search?q=${encodeURIComponent(node.tag)}`,
        className: ['hashtag'],
        'data-tag': node.tag,
      };
      node.children = [{ type: 'text', value: `#${node.tag}` }];
    });

    visit(tree, 'container' as any, (node: any) => {
      node.type = 'element';
      node.tagName = 'div';
      node.properties = {
        className: ['custom-container', node.kind],
      };
      node.children = [
        ...(node.title
          ? [
              {
                type: 'element',
                tagName: 'div',
                properties: { className: ['container-title'] },
                children: [{ type: 'text', value: node.title }],
              },
            ]
          : []),
        {
          type: 'element',
          tagName: 'div',
          properties: { className: ['container-content'] },
          children: node.children || [],
        },
      ];
    });
  };
}

/**
 * 渲染 Markdown 为 HTML 字符串
 */
export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<string> {
  const {
    gfm = true,
    math = true,
    frontmatter = true,
    sanitize = true,
    highlight = true,
    highlightTheme,
    customSyntax = true,
  } = options;

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

  // 添加自定义语法插件
  if (customSyntax) {
    processor.use(remarkMention);
    processor.use(remarkHashtag);
    processor.use(remarkContainer);
  }

  // 添加 Shiki 代码高亮
  if (highlight) {
    processor.use(remarkShiki, { theme: highlightTheme });
  }

  // 转换为 HTML
  processor.use(remarkRehype, { allowDangerousHtml: true });

  // 解析嵌入的 HTML
  processor.use(rehypeRaw);

  // 处理自定义节点
  if (customSyntax) {
    processor.use(rehypeCustomNodes);
  }

  // 添加数学公式渲染
  if (math) {
    processor.use(rehypeKatex);
  }

  // 添加 XSS 防护（使用自定义 schema）
  if (sanitize) {
    processor.use(rehypeSanitize, customSanitizeSchema);
  }

  processor.use(rehypeStringify);

  const result = await processor.process(markdown);
  return String(result);
}
