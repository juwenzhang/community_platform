import { theme as antdTheme, ConfigProvider } from 'antd';
import FeedPage from './pages/feed';

interface FeedAppProps {
  basename?: string;
}

/**
 * Feed 子应用根组件
 *
 * 读取主应用设置的 data-theme 属性，同步 Antd 暗色主题。
 * Garfish sandbox=false，CSS 变量可从主应用继承。
 */
export default function FeedApp({ basename }: FeedAppProps) {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

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
