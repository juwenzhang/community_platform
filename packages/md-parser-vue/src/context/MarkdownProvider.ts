import type { EventHandlers, RenderEngineOptions } from '@luhanxin/md-parser-core';
import { type InjectionKey, inject, provide, reactive } from 'vue';

export interface MarkdownProviderValue {
  theme?: { code?: { dark?: string; light?: string } };
  eventHandlers?: EventHandlers;
  renderEngine?: RenderEngineOptions;
}

const MARKDOWN_PROVIDER_KEY: InjectionKey<MarkdownProviderValue> = Symbol('MarkdownProvider');

/**
 * 提供 Markdown 全局配置
 */
export function provideMarkdownContext(value: MarkdownProviderValue): void {
  provide(MARKDOWN_PROVIDER_KEY, reactive(value));
}

/**
 * 注入 Markdown 全局配置
 */
export function useMarkdownContext(): MarkdownProviderValue {
  return inject(MARKDOWN_PROVIDER_KEY, {});
}
