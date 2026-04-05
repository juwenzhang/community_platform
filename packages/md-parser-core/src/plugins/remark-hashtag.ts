import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { HashtagNode } from '../types/ast';

/**
 * #标签插件
 *
 * 语法: #标签名
 *
 * 示例:
 * - `这篇文章讨论了 #Rust 和 #WebAssembly。`
 * - `标签：#前端 #后端 #数据库`
 *
 * 注意:
 * - 不与 Markdown 标题 `#` 冲突（标题后必须有空格）
 * - 标签名只允许字母、数字、下划线、中文
 * - 标签名长度 1-30
 */
export const remarkHashtag: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === null) return;

    const value = node.value;
    // 正则：#标签名
    // 不匹配 Markdown 标题（标题后必须有空格）
    // 标签规则：字母、数字、下划线、中文，长度 1-30
    const regex = /#([a-zA-Z0-9_\u4e00-\u9fa5]{1,30})(?![a-zA-Z0-9_\u4e00-\u9fa5])/g;

    const matches = [...value.matchAll(regex)];
    if (matches.length === 0) return;

    const newNodes: any[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const [fullMatch, tag] = match;
      const startIndex = match.index!;

      // 添加之前的文本
      if (startIndex > lastIndex) {
        newNodes.push({
          type: 'text',
          value: value.slice(lastIndex, startIndex),
        });
      }

      // 添加标签节点
      const hashtagNode: HashtagNode = {
        type: 'hashtag',
        tag,
      };
      newNodes.push(hashtagNode);

      lastIndex = startIndex + fullMatch.length;
    }

    // 添加剩余文本
    if (lastIndex < value.length) {
      newNodes.push({
        type: 'text',
        value: value.slice(lastIndex),
      });
    }

    // 替换原节点
    // 直接转换为 HTML 节点，避免 remark-rehype 转换问题
    const htmlNodes = newNodes.map((node) => {
      if (node.type === 'hashtag') {
        return {
          type: 'html',
          value: `<a href="/search?q=${encodeURIComponent(node.tag)}" className="hashtag" data-tag="${node.tag}">#${node.tag}</a>`,
        };
      }
      return node;
    });
    parent.children.splice(index!, 1, ...htmlNodes);
  });
};

/**
 * 将 HashtagNode 转换为 HTML
 */
export function hashtagToHast() {
  return (tree: Root) => {
    visit(tree, 'hashtag' as any, (node: any) => {
      node.type = 'html';
      node.value = `<a href="/search?q=${encodeURIComponent(node.tag)}" class="hashtag" data-tag="${node.tag}">#${node.tag}</a>`;
    });
  };
}
