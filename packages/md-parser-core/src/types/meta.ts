/**
 * 文章元数据类型定义
 */
export interface ArticleMeta {
  /** 文章标题（从 frontmatter 或第一个 h1） */
  title?: string;
  /** 文章描述/摘要 */
  description?: string;
  /** 标签列表 */
  tags?: string[];
  /** 发布日期 */
  date?: string;
  /** 阅读时间估算（秒） */
  readingTime?: number;
  /** 字数统计 */
  wordCount?: number;
}
