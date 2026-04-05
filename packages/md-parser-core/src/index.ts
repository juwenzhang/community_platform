// 核心解析和渲染

// 解析和渲染选项
export type { ParseOptions, RenderOptions } from './core';
export {
  countWords,
  estimateReadingTime,
  extractMeta,
  extractPlainText,
  extractToc,
  parseMarkdownToAst,
  renderMarkdown,
} from './core';
// 代码高亮
export { COMMON_LANGUAGES, highlightCode } from './core/highlight';

// 自定义语法插件
export {
  remarkContainer,
  remarkHashtag,
  remarkMention,
} from './plugins';
// XSS 防护
export { containsDangerousContent, customSanitizeSchema, sanitizeHtml } from './sanitize/schema';
// 类型定义
export type { ArticleMeta, ContainerNode, HashtagNode, MentionNode, TocItem } from './types';
