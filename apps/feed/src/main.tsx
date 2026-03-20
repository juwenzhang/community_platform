import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import FeedApp from './FeedApp';

// Garfish 子应用生命周期
let root: ReactDOM.Root | null = null;

export const provider = () => ({
  render({ dom, basename }: { dom: HTMLElement; basename: string }) {
    const container = dom.querySelector('#root') || dom;
    root = ReactDOM.createRoot(container);
    root.render(
      <StrictMode>
        <FeedApp basename={basename} />
      </StrictMode>,
    );
  },
  destroy(_args: { dom: HTMLElement }) {
    root?.unmount();
    root = null;
  },
});

// 独立运行模式（不通过 Garfish 加载时）
// @ts-expect-error
if (!window.__GARFISH__) {
  const container = document.getElementById('root');
  if (container) {
    root = ReactDOM.createRoot(container);
    root.render(
      <StrictMode>
        <FeedApp basename="/" />
      </StrictMode>,
    );
  }
}
