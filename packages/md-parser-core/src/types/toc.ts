/**
 * 目录项类型定义
 */
export interface TocItem {
  /** 标题文本 */
  text: string;
  /** 锚点 ID（用于页内跳转） */
  id: string;
  /** 标题层级（1-6） */
  level: number;
  /** 子级目录 */
  children?: TocItem[];
}
