import type { Paragraph, Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import type { ContainerNode } from '../types/ast';

const CONTAINER_TYPES = ['tip', 'warning', 'info', 'danger'] as const;
type ContainerKind = (typeof CONTAINER_TYPES)[number];

const OPEN_REGEX = /^:::(tip|warning|info|danger)(?:\s+(.+))?$/;
const CLOSE_REGEX = /^:::$/;

/**
 * :::容器 remark 插件
 *
 * 职责：遍历 AST 顶层节点序列，匹配 `:::type [title]` 开标记和 `:::` 闭标记，
 * 将中间的所有节点包裹为 ContainerNode 自定义节点。
 * HTML 转换由 hast-handlers.ts 在 remark-rehype 阶段统一处理。
 *
 * 语法:
 * ```
 * :::tip [标题]
 * 多行内容...
 * 支持 **Markdown** 语法
 * :::
 * ```
 *
 * 支持类型: tip, warning, info, danger
 *
 * 与 GLM 版本的区别:
 * - GLM 版只匹配单个 paragraph 内的文本，多行容器解析失败
 * - 本版本遍历相邻节点序列，正确支持多行/嵌套 Markdown 内容
 */
export const remarkContainer: Plugin<[], Root> = () => (tree: Root) => {
  transformContainers(tree);
};

/**
 * 递归处理容器节点
 */
function transformContainers(parent: Parent): void {
  const newChildren: Node[] = [];
  let i = 0;

  while (i < parent.children.length) {
    const node = parent.children[i];
    const openMatch = matchOpenTag(node);

    if (openMatch) {
      // 找到开标记，搜索对应的闭标记
      const { kind, title } = openMatch;
      const closeIndex = findCloseTag(parent.children, i + 1);

      if (closeIndex !== -1) {
        // 收集开标记和闭标记之间的所有节点作为容器内容
        const contentNodes = parent.children.slice(i + 1, closeIndex);

        // 递归处理内容中的嵌套容器
        const containerContent: Parent = {
          type: 'root' as any,
          children: [...contentNodes],
        };
        transformContainers(containerContent);

        // 创建 ContainerNode
        const containerNode: ContainerNode = {
          type: 'container',
          kind,
          title,
          children: containerContent.children,
          data: {
            hName: 'container',
          },
        };

        newChildren.push(containerNode);
        i = closeIndex + 1; // 跳过闭标记
        continue;
      }
    }

    // 非容器节点，直接保留
    newChildren.push(node);
    i++;
  }

  parent.children = newChildren;
}

/**
 * 检查节点是否为容器开标记 `:::type [title]`
 */
function matchOpenTag(node: Node): { kind: ContainerKind; title?: string } | null {
  if (node.type !== 'paragraph') return null;

  const paragraph = node as Paragraph;
  if (paragraph.children.length === 0) return null;

  const firstChild = paragraph.children[0];
  if (firstChild.type !== 'text') return null;

  const text = (firstChild as Text).value;
  // 开标记必须是段落的唯一内容（或第一行）
  const firstLine = text.split('\n')[0];
  const match = firstLine.match(OPEN_REGEX);

  if (!match) return null;

  // 确保段落只包含开标记文本（可能有尾随换行）
  const remainingText = text.slice(firstLine.length).trim();
  if (remainingText.length > 0 || paragraph.children.length > 1) {
    // 开标记后面还有内容，说明不是纯开标记段落
    // 但如果是单行段落且只有文本节点，仍然匹配
    if (paragraph.children.length > 1) return null;
    if (remainingText.length > 0) return null;
  }

  return {
    kind: match[1] as ContainerKind,
    title: match[2] || undefined,
  };
}

/**
 * 从 startIndex 开始搜索闭标记 `:::`
 * 支持嵌套：遇到新的开标记会增加嵌套深度
 */
function findCloseTag(children: Node[], startIndex: number): number {
  let depth = 1;

  for (let i = startIndex; i < children.length; i++) {
    const node = children[i];

    if (node.type !== 'paragraph') continue;

    const paragraph = node as Paragraph;
    if (paragraph.children.length === 0) continue;

    const firstChild = paragraph.children[0];
    if (firstChild.type !== 'text') continue;

    const text = (firstChild as Text).value.trim();

    // 检查是否为嵌套的开标记
    if (OPEN_REGEX.test(text) && paragraph.children.length === 1) {
      depth++;
      continue;
    }

    // 检查是否为闭标记
    if (CLOSE_REGEX.test(text) && paragraph.children.length === 1) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1; // 未找到匹配的闭标记
}
