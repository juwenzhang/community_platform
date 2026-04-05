import type { EventHandlers, RenderEngineOptions } from '@luhanxin/md-parser-core';
import React, { createContext, type ReactNode, useContext } from 'react';

/**
 * 组件覆盖映射：用户可自定义特定元素的渲染组件
 */
export interface ComponentOverrides {
  mention?: React.ComponentType<{ username: string }>;
  hashtag?: React.ComponentType<{ tag: string }>;
  codeBlock?: React.ComponentType<{ code: string; language: string }>;
  image?: React.ComponentType<{ src: string; alt: string }>;
}

/**
 * Markdown 全局上下文
 */
export interface MarkdownContextValue {
  /** 主题配置 */
  theme?: {
    code?: { dark?: string; light?: string };
  };
  /** 组件覆盖 */
  components?: ComponentOverrides;
  /** 事件回调 */
  eventHandlers?: EventHandlers;
  /** 渲染引擎配置 */
  renderEngine?: RenderEngineOptions;
}

const MarkdownContext = createContext<MarkdownContextValue>({});

/**
 * Markdown 全局 Provider
 *
 * 多个 MarkdownRenderer 实例可共享主题/事件/组件配置。
 *
 * @example
 * ```tsx
 * <MarkdownProvider
 *   eventHandlers={{ onMentionClick: (u) => navigate(`/user/${u}`) }}
 *   theme={{ code: { dark: 'github-dark', light: 'github-light' } }}
 * >
 *   <MarkdownRenderer content={md1} />
 *   <MarkdownRenderer content={md2} />
 * </MarkdownProvider>
 * ```
 */
export function MarkdownProvider({
  children,
  ...value
}: MarkdownContextValue & { children: ReactNode }) {
  return <MarkdownContext.Provider value={value}>{children}</MarkdownContext.Provider>;
}

/**
 * 获取 Markdown 上下文
 */
export function useMarkdownContext(): MarkdownContextValue {
  return useContext(MarkdownContext);
}
