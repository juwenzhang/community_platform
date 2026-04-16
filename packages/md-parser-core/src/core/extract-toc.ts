import type { Heading, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { TocItem } from '../types';

/**
 * 从 mdast AST 提取目录树
 */
export function extractToc(ast: Root): TocItem[] {
  const headings: TocItem[] = [];

  visit(ast, 'heading', (node: Heading) => {
    const text = extractTextFromHeading(node);
    const id = generateHeadingId(text, headings.length);

    headings.push({
      text,
      id,
      level: node.depth,
    });
  });

  // 构建嵌套树结构
  return buildTocTree(headings);
}

/**
 * 从标题节点提取文本
 */
function extractTextFromHeading(node: Heading): string {
  let text = '';
  visit(node, 'text', (child) => {
    text += child.value;
  });
  return text.trim();
}

/**
 * 生成标题锚点 ID
 */
function generateHeadingId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `heading-${index}`;
}

/**
 * 构建嵌套目录树
 */
function buildTocTree(headings: TocItem[]): TocItem[] {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    // 弹出栈顶元素，直到找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // 没有父节点，作为根节点
      root.push(heading);
    } else {
      // 添加为栈顶节点的子节点
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(heading);
    }

    stack.push(heading);
  }

  return root;
}
