import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { MentionNode } from '../types/ast';

/**
 * @用户提及 remark 插件
 *
 * 职责：只负责在 mdast AST 中产出 MentionNode 自定义节点。
 * HTML 转换由 hast-handlers.ts 在 remark-rehype 阶段统一处理。
 *
 * 语法: @username
 *
 * 规则:
 * - 用户名：字母、数字、下划线、中文，长度 1-30
 * - 不匹配邮箱地址（前面不能是字母数字）
 * - 不匹配行首 Markdown 语法
 *
 * 示例:
 * - `你好 @luhanxin，请查看这篇文章。`
 * - `感谢 @张三 的帮助。`
 */
export const remarkMention: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === undefined || index === null) return;

    const value = node.value;
    const regex =
      /(?:^|[^a-zA-Z0-9])@([a-zA-Z0-9_\u4e00-\u9fa5]{1,30})(?![a-zA-Z0-9_\u4e00-\u9fa5@])/g;

    const matches = [...value.matchAll(regex)];
    if (matches.length === 0) return;

    const newNodes: (Text | MentionNode)[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const [fullMatch, username] = match;
      const matchStart = match.index!;

      // 计算 @ 符号的实际位置（fullMatch 可能包含前导非字母数字字符）
      const atIndex = fullMatch.indexOf('@');
      const prefixEnd = matchStart + atIndex;

      // 添加 @ 之前的文本（包括前导字符）
      if (prefixEnd > lastIndex) {
        newNodes.push({
          type: 'text',
          value: value.slice(lastIndex, prefixEnd),
        } as Text);
      }

      // 产出 MentionNode（不做 HTML 转换）
      newNodes.push({
        type: 'mention',
        username,
        data: {
          hName: 'mention',
        },
      } as MentionNode);

      lastIndex = matchStart + fullMatch.length;
    }

    // 添加剩余文本
    if (lastIndex < value.length) {
      newNodes.push({
        type: 'text',
        value: value.slice(lastIndex),
      } as Text);
    }

    // 替换原节点
    parent.children.splice(index, 1, ...newNodes);
  });
};
