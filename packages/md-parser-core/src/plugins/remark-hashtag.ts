import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { HashtagNode } from '../types/ast';

/**
 * #标签 remark 插件
 *
 * 职责：只负责在 mdast AST 中产出 HashtagNode 自定义节点。
 * HTML 转换由 hast-handlers.ts 在 remark-rehype 阶段统一处理。
 *
 * 语法: #标签名
 *
 * 规则:
 * - 标签名：字母、数字、下划线、中文，长度 1-30
 * - 不与 Markdown 标题 `# ` 冲突（标题后有空格，且是块级元素）
 * - hashtag 只出现在 inline 文本中
 *
 * 示例:
 * - `这篇文章讨论了 #Rust 和 #WebAssembly。`
 * - `标签：#前端 #后端 #数据库`
 */
export const remarkHashtag: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === undefined || index === null) return;

    const value = node.value;
    const regex = /#([a-zA-Z0-9_\u4e00-\u9fa5]{1,30})(?![a-zA-Z0-9_\u4e00-\u9fa5])/g;

    const matches = [...value.matchAll(regex)];
    if (matches.length === 0) return;

    const newNodes: (Text | HashtagNode)[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const [fullMatch, tag] = match;
      const startIndex = match.index!;

      // 添加之前的文本
      if (startIndex > lastIndex) {
        newNodes.push({
          type: 'text',
          value: value.slice(lastIndex, startIndex),
        } as Text);
      }

      // 产出 HashtagNode（不做 HTML 转换）
      newNodes.push({
        type: 'hashtag',
        tag,
        data: {
          hName: 'hashtag',
        },
      } as HashtagNode);

      lastIndex = startIndex + fullMatch.length;
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
