import { RocketOutlined } from '@ant-design/icons';
import { Space, Typography } from 'antd';
import FeatureCard from './components/FeatureCard';
import HeroBanner from './components/HeroBanner';

const { Title, Paragraph } = Typography;

/** 首页 — 社区入口 */
export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Title level={2}>
          <RocketOutlined className="mr-2 text-primary-500" />
          Welcome to Luhanxin Community
        </Title>
        <Paragraph className="text-gray-500 text-base">
          一个面向开发者的技术社区平台，分享知识、交流技术、共同成长。
        </Paragraph>
      </div>

      <HeroBanner />

      <Space direction="vertical" size="middle" className="w-full mt-6">
        <FeatureCard
          icon="CodeOutlined"
          title="技术文章"
          description="高质量技术文章，覆盖 Rust、React、微服务等领域"
          tag={{ text: '即将上线', color: 'blue' }}
        />
        <FeatureCard
          icon="TeamOutlined"
          title="社区动态"
          description="关注开发者动态，发现有趣的项目和讨论"
          tag={{ text: '开发中', color: 'cyan' }}
        />
      </Space>

      <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
        <Paragraph className="text-gray-400 text-sm !mb-0">
          技术栈：React 18 + Garfish 微前端 + Rust (Axum + Tonic) + PostgreSQL + Protobuf
        </Paragraph>
      </div>
    </div>
  );
}
