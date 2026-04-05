import type { Paragraph, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { ContainerNode } from '../types/ast';

/**
 * :::容器插件
 *
 * 语法:
 * :::类型 [标题]
 * 内容
 * :::
 *
 * 支持类型:
 * - tip: 提示
 * - warning: 警告
 * - info: 信息
 * - danger: 危险
 *
 * 示例:
 * :::tip
 * 这是一个提示信息。
 * :::
 *
 * :::warning 注意
 * 这是一个警告信息。
 * :::
 */
export const remarkContainer: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
    if (!parent || index === null) return;

    // 匹配 :::type [title]
    const firstChild = node.children[0];
    if (firstChild?.type !== 'text') return;

    const text = firstChild.value;
    const lines = text.split('\n');

    // 第一行应该是 :::type [title]
    const firstLine = lines[0];
    const match = firstLine.match(/^:::(tip|warning|info|danger)(?:\s+(.+))?$/);

    if (!match) return;

    const kind = match[1] as 'tip' | 'warning' | 'info' | 'danger';
    const title = match[2];

    // 最后一行应该是 :::
    const lastLine = lines[lines.length - 1];
    if (lastLine.trim() !== ':::') return;

    // 提取内容（去掉第一行和最后一行）
    const content = lines.slice(1, -1).join('\n');

    // 创建 HTML 节点
    const htmlNode: any = {
      type: 'html',
      value: `<div className="custom-container ${kind}">
${title ? `<div className="container-title">${title}</div>` : ''}
<div className="container-content">
${content}
</div>
</div>`,
    };

    // 替换原节点
    parent.children.splice(index!, 1, htmlNode);
  });
};

/**
 * 将 ContainerNode 转换为 HTML
 */
export function containerToHast() {
  return (tree: Root) => {
    visit(tree, 'container' as any, (node: any) => {
      // 递归处理子节点
      const content = node.children
        .map((child: any) => {
          if (child.type === 'text') {
            return child.value;
          }
          // 简化处理，实际应该递归转换
          return '';
        })
        .join('');

      const titleHtml = node.title ? `<div class="container-title">${node.title}</div>` : '';

      node.type = 'html';
      node.value = `<div class="custom-container ${node.kind}">
${titleHtml}
<div class="container-content">
${content}
</div>
</div>`;
    });
  };
}
