import { Divider, Space, Tag, Typography } from 'antd';
import FeedList from './components/FeedList';

const { Title } = Typography;

interface FeedPageProps {
  basename?: string;
}

/** Feed 动态页面入口 */
export default function FeedPage({ basename }: FeedPageProps) {
  return (
    <div className="max-w-2xl mx-auto" style={{ padding: '24px' }}>
      <Title level={3}>社区动态</Title>
      <Tag color="green">Feed 子应用已加载</Tag>
      {basename && basename !== '/' && <Tag color="blue">Garfish 模式 (basename: {basename})</Tag>}
      <Divider />
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <FeedList />
      </Space>
    </div>
  );
}
