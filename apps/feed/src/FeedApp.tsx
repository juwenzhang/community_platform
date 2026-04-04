import { getHostThemeFromDocument, subscribeHostTheme } from '@luhanxin/app-registry/theme-bridge';
import { theme as antdTheme, ConfigProvider } from 'antd';
import { useSyncExternalStore } from 'react';
import FeedPage from './pages/feed';

interface FeedAppProps {
  basename?: string;
}

function useHostTheme() {
  return useSyncExternalStore(subscribeHostTheme, getHostThemeFromDocument, () => 'light' as const);
}

/**
 * Feed 子应用根组件
 *
 * 读取主应用设置的 data-theme，并在主应用切换主题时重渲染以同步 Antd algorithm。
 * Garfish sandbox=false，CSS 变量可从主应用继承。
 */
export default function FeedApp({ basename }: FeedAppProps) {
  const hostTheme = useHostTheme();
  const isDark = hostTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#1e80ff', borderRadius: 4 },
      }}
    >
      <FeedPage basename={basename} />
    </ConfigProvider>
  );
}
