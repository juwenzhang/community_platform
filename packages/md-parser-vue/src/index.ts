// 主渲染组件
import MarkdownRenderer from './MarkdownRenderer.vue';

// 类型导出
export type { ArticleMeta, EventHandlers, ParseResult, TocItem } from '@luhanxin/md-parser-core';
// 子组件
export { default as CodeBlock } from './components/CodeBlock.vue';
export { default as CustomContainer } from './components/CustomContainer.vue';
export { default as Hashtag } from './components/Hashtag.vue';
export { default as Mention } from './components/Mention.vue';
export { default as MermaidDiagram } from './components/MermaidDiagram.vue';
export { useActiveHeading } from './composables/useActiveHeading';
export { useEventDelegation } from './composables/useEventDelegation';
// Composables
export type { UseMarkdownOptions, UseMarkdownResult } from './composables/useMarkdown';
export { useMarkdown } from './composables/useMarkdown';
export type { TextSelectionResult } from './composables/useTextSelection';
export { useTextSelection } from './composables/useTextSelection';
export { useToc } from './composables/useToc';
// Provider
export type { MarkdownProviderValue } from './context/MarkdownProvider';
export { provideMarkdownContext, useMarkdownContext } from './context/MarkdownProvider';
export { MarkdownRenderer };
