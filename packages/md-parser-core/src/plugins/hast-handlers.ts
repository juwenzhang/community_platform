import type { Element as HastElement, Text as HastText } from 'hast';
import type { ContainerNode, HashtagNode, MentionNode } from '../types/ast';

/**
 * remark-rehype 自定义 handlers
 *
 * 将自定义 mdast 节点（MentionNode, HashtagNode, ContainerNode）
 * 统一映射为标准 hast 元素。
 *
 * 通过 remark-rehype 的 `handlers` 选项注册：
 * ```ts
 * processor.use(remarkRehype, {
 *   allowDangerousHtml: true,
 *   handlers: customHandlers,
 * });
 * ```
 *
 * 为什么用 handlers 而非直接在 remark 插件中转 HTML:
 * 1. 保持 mdast AST 的语义完整性（自定义节点可被 TOC/搜索等提取层使用）
 * 2. 正确使用 `class` 而非 `className`（hast 规范）
 * 3. 避免 remark 插件和 rehype 插件之间的逻辑冲突（GLM 的死代码问题）
 * 4. hast handler 可以利用 state 上下文处理嵌套内容（如 ContainerNode 的子节点）
 */

type State = {
  all: (node: any) => (HastElement | HastText)[];
  one: (node: any) => HastElement | HastText | null;
};

/**
 * MentionNode → <a class="mention" href="/user/{username}" data-username="{username}">@{username}</a>
 */
function handleMention(_state: State, node: MentionNode): HastElement {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: `/user/${node.username}`,
      className: ['mention'],
      'data-username': node.username,
    },
    children: [
      {
        type: 'text',
        value: `@${node.username}`,
      },
    ],
  };
}

/**
 * HashtagNode → <a class="hashtag" href="/search?q={tag}" data-tag="{tag}">#{tag}</a>
 */
function handleHashtag(_state: State, node: HashtagNode): HastElement {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: `/search?q=${encodeURIComponent(node.tag)}`,
      className: ['hashtag'],
      'data-tag': node.tag,
    },
    children: [
      {
        type: 'text',
        value: `#${node.tag}`,
      },
    ],
  };
}

/**
 * ContainerNode → <div class="custom-container {kind}">
 *   <div class="container-title"><span class="container-icon">{icon}</span>{title}</div>
 *   <div class="container-content">{children}</div>
 * </div>
 */
function handleContainer(state: State, node: ContainerNode): HastElement {
  const iconMap: Record<string, string> = {
    tip: '💡',
    warning: '⚠️',
    info: 'ℹ️',
    danger: '🚫',
  };

  const defaultTitleMap: Record<string, string> = {
    tip: '提示',
    warning: '警告',
    info: '信息',
    danger: '危险',
  };

  const titleChildren: (HastElement | HastText)[] = [
    {
      type: 'element',
      tagName: 'span',
      properties: { className: ['container-icon'] },
      children: [{ type: 'text', value: iconMap[node.kind] || '' }],
    },
    {
      type: 'text',
      value: ` ${node.title || defaultTitleMap[node.kind] || ''}`,
    },
  ];

  // 递归处理子节点
  const contentChildren = state.all(node);

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['custom-container', node.kind],
    },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['container-title'] },
        children: titleChildren,
      },
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['container-content'] },
        children: contentChildren,
      },
    ],
  };
}

/**
 * 导出所有自定义 handlers
 * 用于 remark-rehype 的 handlers 选项
 */
export const customHandlers: Record<string, (state: any, node: any) => HastElement> = {
  mention: handleMention,
  hashtag: handleHashtag,
  container: handleContainer,
};
