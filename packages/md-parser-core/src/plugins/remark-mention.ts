import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { MentionNode } from '../types/ast';

/**
 * @用户提及插件
 *
 * 语法: @username
 *
 * 示例:
 * - `你好 @luhanxin，请查看这篇文章。`
 * - `感谢 @张三 的帮助。`
 *
 * 注意:
 * - 不匹配邮箱地址（xxx@yyy.com）
 * - 支持中文用户名
 * - 用户名只允许字母、数字、下划线、中文
 */
export const remarkMention: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === null) return;

    const value = node.value;
    // 正则：@用户名（不匹配邮箱）
    // 用户名规则：字母、数字、下划线、中文，长度 1-30
    // 排除邮箱：前面不能是字母数字
    const regex =
      /(?:^|[^a-zA-Z0-9])@([a-zA-Z0-9_\u4e00-\u9fa5]{1,30})(?![a-zA-Z0-9_\u4e00-\u9fa5@])/g;

    const matches = [...value.matchAll(regex)];
    if (matches.length === 0) return;

    const newNodes: any[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const [fullMatch, username] = match;
      const startIndex = match.index!;

      // 添加之前的文本
      if (startIndex > lastIndex) {
        newNodes.push({
          type: 'text',
          value: value.slice(lastIndex, startIndex),
        });
      }

      // 添加提及节点
      const mentionNode: MentionNode = {
        type: 'mention',
        username,
      };
      newNodes.push(mentionNode);

      lastIndex = startIndex + fullMatch.length;
    }

    // 添加剩余文本
    if (lastIndex < value.length) {
      newNodes.push({
        type: 'text',
        value: value.slice(lastIndex),
      });
    }

    // 替换原节点（使用明确的索引）
    // 直接转换为 HTML 节点，避免 remark-rehype 转换问题
    const htmlNodes = newNodes.map((node) => {
      if (node.type === 'mention') {
        return {
          type: 'html',
          value: `<a href="/user/${node.username}" className="mention" data-username="${node.username}">@${node.username}</a>`,
        };
      }
      return node;
    });
    parent.children.splice(index!, 1, ...htmlNodes);
  });
};

/**
 * 将 MentionNode 转换为 HTML
 */
export function mentionToHast() {
  return (tree: Root) => {
    visit(tree, 'mention' as any, (node: any) => {
      node.type = 'html';
      node.value = `<a href="/user/${node.username}" class="mention" data-username="${node.username}">@${node.username}</a>`;
    });
  };
}
