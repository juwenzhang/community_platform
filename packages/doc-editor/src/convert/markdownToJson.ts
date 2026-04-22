/**
 * Markdown → ProseMirror JSON 转换器
 *
 * 实现策略：
 * 1. 复用 @luhanxin/md-parser-core 的 parseMarkdownToAst 拿到 mdast
 * 2. 递归遍历 mdast 节点，映射到 ProseMirror JSON
 *
 * 保真范围（Phase 1）：
 * - CommonMark 基础节点：paragraph / heading / list / listItem / blockquote /
 *   code / inlineCode / link / image / strong / emphasis / text / thematicBreak /
 *   hardBreak / softBreak
 * - GFM：delete（删除线）/ table / taskList
 *
 * 不支持（Phase 2+）：
 * - html（原样保留为 text 带警告）
 * - footnote
 * - 自定义 :::容器（留给 Container 块扩展）
 * - 自定义 @mention / #hashtag（留给对应块扩展）
 * - 数学公式（留给 Math 块扩展）
 */

import { parseMarkdownToAst } from '@luhanxin/md-parser-core';
import type {
  Blockquote,
  Break,
  Code,
  Delete,
  Emphasis,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Table,
  Text,
  ThematicBreak,
} from 'mdast';
import type { ProseMirrorJSON } from '../types/editor';

/**
 * 转换 Markdown 字符串为 ProseMirror JSON doc
 */
export async function markdownToJson(markdown: string): Promise<ProseMirrorJSON> {
  const ast = await parseMarkdownToAst(markdown);
  return rootToDoc(ast);
}

function rootToDoc(root: Root): ProseMirrorJSON {
  const content = root.children.map(transformBlock).filter((n): n is ProseMirrorJSON => n !== null);

  // 空文档也必须至少有一个段落（ProseMirror schema 要求）
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content,
  };
}

function transformBlock(node: RootContent): ProseMirrorJSON | null {
  switch (node.type) {
    case 'paragraph':
      return transformParagraph(node);
    case 'heading':
      return transformHeading(node);
    case 'list':
      return transformList(node);
    case 'blockquote':
      return transformBlockquote(node);
    case 'code':
      return transformCodeBlock(node);
    case 'thematicBreak':
      return transformThematicBreak(node);
    case 'table':
      return transformTable(node);
    // GFM math 扩展（remark-math 添加的节点类型）
    // biome-ignore lint/suspicious/noExplicitAny: mdast-util-math 扩展节点，RootContent 类型未覆盖
    case 'math' as any: {
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      const mathNode = node as any;
      return {
        type: 'blockMath',
        attrs: { formula: mathNode.value ?? '' },
      };
    }
    // 自定义 container 节点（由 md-parser-core 的 remark-container 产出）
    // biome-ignore lint/suspicious/noExplicitAny: 自定义节点在 RootContentMap 中声明
    case 'container' as any: {
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      const containerNode = node as any;
      const children = (containerNode.children ?? [])
        .map((c: RootContent) => transformBlock(c))
        .filter((n: ProseMirrorJSON | null): n is ProseMirrorJSON => n !== null);
      return {
        type: 'container',
        attrs: {
          type: containerNode.kind ?? 'tip',
          title: containerNode.title ?? null,
        },
        content: children.length > 0 ? children : [{ type: 'paragraph' }],
      };
    }
    case 'html':
      // HTML 块暂不支持，降级为纯文本段落（保留内容）
      return {
        type: 'paragraph',
        content: [{ type: 'text', text: node.value }],
      };
    case 'yaml':
      // Frontmatter 暂不在 editor 中编辑，忽略
      return null;
    default:
      // 未知块类型，降级
      // biome-ignore lint/suspicious/noExplicitAny: 未知节点
      console.warn(`[doc-editor] Unknown block type: ${(node as any).type}`);
      return null;
  }
}

function transformParagraph(node: Paragraph): ProseMirrorJSON {
  return {
    type: 'paragraph',
    content: transformInlines(node.children),
  };
}

function transformHeading(node: Heading): ProseMirrorJSON {
  return {
    type: 'heading',
    attrs: { level: node.depth },
    content: transformInlines(node.children),
  };
}

function transformList(node: List): ProseMirrorJSON {
  // GFM 任务列表：所有 listItem 都有 checked 字段时视为任务列表
  const isTaskList =
    !node.ordered && node.children.every((item) => typeof item.checked === 'boolean');

  if (isTaskList) {
    return {
      type: 'taskList',
      content: node.children.map((item) => ({
        type: 'taskItem',
        attrs: { checked: item.checked ?? false },
        content: transformListItemContent(item),
      })),
    };
  }

  return {
    type: node.ordered ? 'orderedList' : 'bulletList',
    attrs: node.ordered && typeof node.start === 'number' ? { start: node.start } : undefined,
    content: node.children.map((item) => ({
      type: 'listItem',
      content: transformListItemContent(item),
    })),
  };
}

function transformListItemContent(item: ListItem): ProseMirrorJSON[] {
  // listItem 的 children 可能含 paragraph / list / blockquote / code 等
  return item.children.map(transformBlock).filter((n): n is ProseMirrorJSON => n !== null);
}

function transformBlockquote(node: Blockquote): ProseMirrorJSON {
  return {
    type: 'blockquote',
    content: node.children.map(transformBlock).filter((n): n is ProseMirrorJSON => n !== null),
  };
}

function transformCodeBlock(node: Code): ProseMirrorJSON {
  // Mermaid 代码块特殊处理：转为独立的 mermaid 节点
  if (node.lang === 'mermaid') {
    return {
      type: 'mermaid',
      attrs: { code: node.value ?? '' },
    };
  }
  return {
    type: 'codeBlock',
    attrs: { language: node.lang ?? null },
    content: node.value ? [{ type: 'text', text: node.value }] : undefined,
  };
}

function transformThematicBreak(_node: ThematicBreak): ProseMirrorJSON {
  return { type: 'horizontalRule' };
}

function transformTable(node: Table): ProseMirrorJSON {
  // GFM 表格：第一行为 header
  const rows = node.children;
  if (rows.length === 0) {
    return { type: 'paragraph' };
  }

  return {
    type: 'table',
    content: rows.map((row, rowIdx) => ({
      type: 'tableRow',
      content: row.children.map((cell) => ({
        type: rowIdx === 0 ? 'tableHeader' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: transformInlines(cell.children),
          },
        ],
      })),
    })),
  };
}

function transformInlines(nodes: PhrasingContent[]): ProseMirrorJSON[] {
  const result: ProseMirrorJSON[] = [];
  for (const node of nodes) {
    const transformed = transformInline(node, []);
    if (Array.isArray(transformed)) {
      result.push(...transformed);
    } else if (transformed !== null) {
      result.push(transformed);
    }
  }
  return result;
}

function transformInline(
  node: PhrasingContent,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>,
): ProseMirrorJSON | ProseMirrorJSON[] | null {
  switch (node.type) {
    case 'text':
      return textWithMarks((node as Text).value, marks);
    case 'strong':
      return flattenInlines((node as Strong).children, [...marks, { type: 'bold' }]);
    case 'emphasis':
      return flattenInlines((node as Emphasis).children, [...marks, { type: 'italic' }]);
    case 'delete':
      return flattenInlines((node as Delete).children, [...marks, { type: 'strike' }]);
    case 'inlineCode':
      return textWithMarks((node as InlineCode).value, [...marks, { type: 'code' }]);
    case 'link': {
      const link = node as Link;
      return flattenInlines(link.children, [
        ...marks,
        {
          type: 'link',
          attrs: { href: link.url, title: link.title ?? null },
        },
      ]);
    }
    case 'image': {
      const img = node as Image;
      return {
        type: 'image',
        attrs: {
          src: img.url,
          alt: img.alt ?? null,
          title: img.title ?? null,
        },
      };
    }
    case 'break':
      return { type: 'hardBreak' };
    // 内联数学 (remark-math 扩展的 inlineMath 类型)
    // biome-ignore lint/suspicious/noExplicitAny: mdast-util-math 扩展
    case 'inlineMath' as any: {
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      const inline = node as any;
      return {
        type: 'inlineMath',
        attrs: { formula: inline.value ?? '' },
      };
    }
    case 'html':
      // 内联 HTML，降级为文本
      // biome-ignore lint/suspicious/noExplicitAny: mdast html 节点
      return textWithMarks((node as any).value, marks);
    default:
      // 未知内联类型
      // biome-ignore lint/suspicious/noExplicitAny: 未知节点
      console.warn(`[doc-editor] Unknown inline type: ${(node as any).type}`);
      return null;
  }
}

function textWithMarks(
  text: string,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>,
): ProseMirrorJSON {
  if (text.length === 0) {
    // ProseMirror 不允许空 text 节点
    return { type: 'text', text: ' ' };
  }
  return {
    type: 'text',
    text,
    marks: marks.length > 0 ? marks : undefined,
  };
}

function flattenInlines(
  children: PhrasingContent[],
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>,
): ProseMirrorJSON[] {
  const result: ProseMirrorJSON[] = [];
  for (const child of children) {
    const transformed = transformInline(child, marks);
    if (Array.isArray(transformed)) {
      result.push(...transformed);
    } else if (transformed !== null) {
      result.push(transformed);
    }
  }
  return result;
}

// 未使用 Break 类型（softBreak 被视为同段落内部空格），保留 import 避免 TS 报错
void ({} as Break);
