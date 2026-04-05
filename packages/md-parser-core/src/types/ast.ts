import type { Node } from 'unist';

/**
 * 扩展的 mdast 节点类型
 */

/**
 * @用户提及节点
 */
export interface MentionNode extends Node {
  type: 'mention';
  username: string;
}

/**
 * #标签节点
 */
export interface HashtagNode extends Node {
  type: 'hashtag';
  tag: string;
}

/**
 * :::容器节点
 */
export interface ContainerNode extends Node {
  type: 'container';
  kind: 'tip' | 'warning' | 'info' | 'danger';
  title?: string;
  children: Node[];
}
