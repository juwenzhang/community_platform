/**
 * DocEditor Context — 注入跨组件共享的配置
 *
 * 如 uploadHandler / 权限判断 / 国际化字典。使用方式：
 *   <DocEditorProvider value={{ uploadHandler }}>
 *     <DocEditor ... />
 *   </DocEditorProvider>
 *
 * DocEditor 组件内部通过 useDocEditorContext() 读取。
 * 也支持通过 props 直接传入覆盖 Context。
 */

import { createContext, type ReactNode, useContext } from 'react';
import type { UploadHandler } from '../types/upload';

export interface DocEditorContextValue {
  uploadHandler?: UploadHandler | null;
  /** 获取当前用户的 JWT（供内部默认 handler 使用） */
  getAuthToken?: () => string | null | undefined;
  /** 国际化字典（可选） */
  locale?: Record<string, string>;
}

const DocEditorContext = createContext<DocEditorContextValue>({});

export interface DocEditorProviderProps {
  value: DocEditorContextValue;
  children: ReactNode;
}

export function DocEditorProvider({ value, children }: DocEditorProviderProps) {
  return <DocEditorContext.Provider value={value}>{children}</DocEditorContext.Provider>;
}

export function useDocEditorContext(): DocEditorContextValue {
  return useContext(DocEditorContext);
}
