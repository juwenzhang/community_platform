import { vueBridge } from '@garfish/bridge-vue-v3';
import { createApp } from 'vue';
import App from './App.vue';

/**
 * Garfish Vue 3 子应用 provider
 *
 * vueBridge 自动处理 render / destroy 生命周期。
 *
 * 注意：不传 appOptions！vueBridge 内部逻辑是：
 * - 有 appOptions → createApp(appOptions)（Options API，需要 template/render）
 * - 无 appOptions → createApp(rootComponent)（SFC 模式，正确）
 * 传空 appOptions 函数会导致 "missing template or render function" 错误。
 */
export const provider = vueBridge({
  rootComponent: App,
});

// 独立运行模式
if (!(window as any).__GARFISH__) {
  const app = createApp(App);
  app.mount('#root');
}
