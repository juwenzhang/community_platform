import FeedPage from './pages/feed';

interface FeedAppProps {
  basename?: string;
}

/**
 * Feed 子应用根组件
 *
 * 作为 Garfish 子应用的入口，将 basename 传递给页面。
 * 如果 Feed 子应用未来有多个页面，可在此处添加 Router。
 */
export default function FeedApp({ basename }: FeedAppProps) {
  return <FeedPage basename={basename} />;
}
