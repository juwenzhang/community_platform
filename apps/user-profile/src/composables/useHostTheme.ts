import {
  getHostThemeFromDocument,
  type HostTheme,
  subscribeHostTheme,
} from '@luhanxin/app-registry/theme-bridge';
import { onUnmounted, ref } from 'vue';

/**
 * 与主应用 data-theme 同步，主应用切换时触发响应式更新。
 */
export function useHostTheme() {
  const theme = ref<HostTheme>(getHostThemeFromDocument());
  const unsubscribe = subscribeHostTheme(() => {
    theme.value = getHostThemeFromDocument();
  });
  onUnmounted(unsubscribe);
  return theme;
}
