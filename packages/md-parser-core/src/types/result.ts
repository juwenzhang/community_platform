import type { ArticleMeta } from './meta';
import type { TocItem } from './toc';

/**
 * 统一的 Markdown 解析结果
 *
 * 由 `renderMarkdown()` 一次 unified pipeline 完成所有提取后返回。
 * React/Vue 的 useMarkdown 直接消费此类型，消除双重解析。
 */
export interface ParseResult {
  /** 渲染后的 HTML 字符串 */
  html: string;
  /** 目录树 */
  toc: TocItem[];
  /** 文章元数据 */
  meta: ArticleMeta;
  /** 纯文本（用于搜索索引、摘要生成） */
  plainText: string;
  /** AST block 分块（用于虚拟列表/Canvas/WebGL 分块渲染） */
  blocks: BlockNode[];
}

/**
 * AST 块级节点
 *
 * 将 Markdown 内容按块级元素（段落/标题/代码块/表格/容器等）分割。
 * 每个 block 独立渲染为 HTML 片段，供虚拟列表和高级渲染引擎使用。
 */
export interface BlockNode {
  /** 块类型 */
  type:
    | 'heading'
    | 'paragraph'
    | 'code'
    | 'table'
    | 'container'
    | 'list'
    | 'blockquote'
    | 'thematicBreak'
    | 'html'
    | 'math';
  /** 该 block 渲染后的 HTML 片段 */
  html: string;
  /** 在原始 Markdown 中的起始行号 */
  startLine: number;
  /** 在原始 Markdown 中的结束行号 */
  endLine: number;
  /** 预估渲染高度（px），用于虚拟列表的占位 div */
  estimatedHeight: number;
}
