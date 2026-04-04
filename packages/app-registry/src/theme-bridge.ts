/**
 * 主应用与子应用之间的主题同步（Garfish 同页多根场景）。
 *
 * 主应用在写入 data-theme / localStorage 后派发该事件；子应用通过 subscribeHostTheme + getHostThemeFromDocument
 * 订阅变化。另用 MutationObserver 兜底（例如仅修改了 DOM 属性而未派发事件的情况）。
 */

export const THEME_CHANGE_EVENT = 'luhanxin:theme-change';

export type HostTheme = 'light' | 'dark';

export interface ThemeChangeDetail {
  theme: HostTheme;
}

export function getHostThemeFromDocument(): HostTheme {
  if (typeof document === 'undefined') return 'light';
  const v = document.documentElement.getAttribute('data-theme');
  return v === 'dark' ? 'dark' : 'light';
}

/** 主应用 theme 切换时调用，通知同页子应用 */
export function dispatchHostThemeChange(theme: HostTheme): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme } satisfies ThemeChangeDetail,
    }),
  );
}

/**
 * 订阅主应用主题变化（CustomEvent + data-theme 属性变更）。
 * 返回取消订阅函数，供 useSyncExternalStore 使用。
 */
export function subscribeHostTheme(onStoreChange: () => void): () => void {
  const onEvent = () => onStoreChange();
  window.addEventListener(THEME_CHANGE_EVENT, onEvent);

  const observer = new MutationObserver(onEvent);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onEvent);
    observer.disconnect();
  };
}
