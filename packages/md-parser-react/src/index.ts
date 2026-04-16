// ─── 主渲染组件 ────────────────────────────────────────

// ─── 子组件 ───────────────────────────────────────────
export type { CodeBlockProps } from './components/CodeBlock';
export { CodeBlock } from './components/CodeBlock';
export type { CustomContainerProps } from './components/CustomContainer';
export { CustomContainer } from './components/CustomContainer';
export type { HashtagProps } from './components/Hashtag';
export { Hashtag } from './components/Hashtag';
export type { MarkdownErrorBoundaryProps } from './components/MarkdownErrorBoundary';
export { MarkdownErrorBoundary } from './components/MarkdownErrorBoundary';
export type { MentionProps } from './components/Mention';
export { Mention } from './components/Mention';
export type { MermaidDiagramProps } from './components/MermaidDiagram';
export { MermaidDiagram } from './components/MermaidDiagram';
// ─── Provider + 错误边界 ───────────────────────────────
export type { ComponentOverrides, MarkdownContextValue } from './context/MarkdownProvider';
export { MarkdownProvider, useMarkdownContext } from './context/MarkdownProvider';
export { useActiveHeading } from './hooks/useActiveHeading';
export { useEventDelegation } from './hooks/useEventDelegation';
// ─── Hooks ─────────────────────────────────────────────
export type { UseMarkdownOptions, UseMarkdownResult } from './hooks/useMarkdown';
export { useMarkdown } from './hooks/useMarkdown';
export type { UseRenderEngineResult } from './hooks/useRenderEngine';
export { useRenderEngine } from './hooks/useRenderEngine';
export type { TextSelectionResult } from './hooks/useTextSelection';
export { useTextSelection } from './hooks/useTextSelection';
export { useToc } from './hooks/useToc';
export type { MarkdownRendererProps } from './MarkdownRenderer';
export { MarkdownRenderer } from './MarkdownRenderer';
