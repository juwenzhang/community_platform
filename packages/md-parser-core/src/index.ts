// ─── 核心解析和渲染 ─────────────────────────────────────

// ─── 性能优化层 ─────────────────────────────────────────
export { LRUCache } from './cache/lru-cache';
export { clearParseCache, getParseCache, ParseCache } from './cache/parse-cache';
// ─── 提取工具（独立使用时） ──────────────────────────────
export { extractMeta } from './core/extract-meta';
export { countWords, estimateReadingTime, extractPlainText } from './core/extract-text';
export { extractToc } from './core/extract-toc';
// ─── 代码高亮 ───────────────────────────────────────────
export { COMMON_LANGUAGES, highlightCode } from './core/highlight';
export type { ParseOptions } from './core/parse';
export { parseMarkdownToAst } from './core/parse';
export type { RenderOptions } from './core/render';
export { renderMarkdown, renderMarkdownToHtml } from './core/render';
// ─── 渲染引擎 ──────────────────────────────────────────
export {
  CanvasStrategy,
  computeComplexity,
  computeComplexityScore,
  createRenderEngine,
  DomStrategy,
  detectRenderLevel,
  fallbackLevel,
  isLevelSupported,
  VirtualListStrategy,
  WebGLStrategy,
} from './engine';
export type { DiffResult } from './incremental/diff';
export { lineDiff } from './incremental/diff';
export type { IncrementalParseResult } from './incremental/incremental-parser';
export { IncrementalParser } from './incremental/incremental-parser';
export type { ExternalLinksOptions } from './plugins';
// ─── 自定义语法插件 ─────────────────────────────────────
// ─── rehype 渲染后处理插件 ──────────────────────────────
export {
  customHandlers,
  rehypeCodeMeta,
  rehypeExternalLinks,
  rehypeHeadingIds,
  rehypeLazyImages,
  remarkContainer,
  remarkHashtag,
  remarkMention,
} from './plugins';
// ─── XSS 防护 ──────────────────────────────────────────
export { customSanitizeSchema } from './sanitize/schema';
export type { ContainerNode, HashtagNode, MentionNode } from './types/ast';
export type {
  DocumentComplexity,
  RenderEngineOptions,
  RenderLevel,
  RenderStrategy,
} from './types/engine';
export type { EventHandlers } from './types/events';
// ─── 类型定义 ──────────────────────────────────────────
export type { ArticleMeta } from './types/meta';
export type { BlockNode, ParseResult } from './types/result';
export type { TocItem } from './types/toc';
export type {
  MermaidWorkerPayload,
  ParseWorkerPayload,
  WorkerRequest,
  WorkerResponse,
} from './types/worker';
export type { WorkerManagerOptions } from './worker';
// ─── Worker 架构 ──────────────────────────────────────
export {
  destroyWorkerManager,
  getWorkerManager,
  WorkerManager,
} from './worker';
