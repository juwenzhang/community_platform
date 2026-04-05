import type { Node } from 'unist';

/**
 * 扩展的 mdast 节点类型
 *
 * 这些是自定义语法插件在 remark 阶段产出的 AST 节点。
 * 通过 hast-handlers.ts 中注册的 handlers，在 remark-rehype 阶段
 * 统一转换为标准 hast 元素。
 */

/**
 * @用户提及节点
 *
 * 由 remark-mention 插件产出。
 * hast-handlers 将其映射为：
 * `<a class="mention" href="/user/{username}" data-username="{username}">@{username}</a>`
 */
export interface MentionNode extends Node {
  type: 'mention';
  /** 用户名 */
  username: string;
  /** remark-rehype handler 标识 */
  data?: { hName?: string };
}

/**
 * #标签节点
 *
 * 由 remark-hashtag 插件产出。
 * hast-handlers 将其映射为：
 * `<a class="hashtag" href="/search?q={tag}" data-tag="{tag}">#{tag}</a>`
 */
export interface HashtagNode extends Node {
  type: 'hashtag';
  /** 标签名 */
  tag: string;
  /** remark-rehype handler 标识 */
  data?: { hName?: string };
}

/**
 * :::容器节点
 *
 * 由 remark-container 插件产出。
 * hast-handlers 将其映射为：
 * ```html
 * <div class="custom-container {kind}">
 *   <div class="container-title"><span class="container-icon">{icon}</span>{title}</div>
 *   <div class="container-content">{children}</div>
 * </div>
 * ```
 */
export interface ContainerNode extends Node {
  type: 'container';
  /** 容器类型 */
  kind: 'tip' | 'warning' | 'info' | 'danger';
  /** 自定义标题（可选） */
  title?: string;
  /** 容器内的子节点（支持嵌套 Markdown） */
  children: Node[];
  /** remark-rehype handler 标识 */
  data?: { hName?: string };
}

/**
 * 声明自定义节点类型到 mdast 类型映射
 * 使 TypeScript 在 visit() 等工具函数中识别自定义节点
 */
declare module 'mdast' {
  interface RootContentMap {
    mention: MentionNode;
    hashtag: HashtagNode;
    container: ContainerNode;
  }

  interface PhrasingContentMap {
    mention: MentionNode;
    hashtag: HashtagNode;
  }
}
