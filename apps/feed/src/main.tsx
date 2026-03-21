import { reactBridge } from '@garfish/bridge-react-v18';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import FeedApp from './FeedApp';

/**
 * Garfish 子应用 provider — 使用官方 bridge-react-v18
 *
 * bridge-react-v18 原生使用 React 18 createRoot API，不会触发
 * "ReactDOM.render is no longer supported" 警告。
 *
 * reactBridge 自动处理：
 * - render / destroy 生命周期导出（基于 createRoot）
 * - dom 挂载节点查找
 * - ErrorBoundary（componentDidCatch）
 * - 独立运行 vs Garfish 加载的环境判断
 */
export const provider = reactBridge({
  el: '#root',
  rootComponent: FeedApp,
  errorBoundary: ({ error }: { error: Error }) => (
    <div style={{ color: 'red', padding: 20 }}>
      <h2>子应用渲染出错</h2>
      <pre>{error?.message}</pre>
    </div>
  ),
});

// 独立运行模式（不通过 Garfish 加载时）
if (!window.__GARFISH__) {
  const container = document.getElementById('root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <StrictMode>
        <FeedApp basename="/" />
      </StrictMode>,
    );
  }
}
