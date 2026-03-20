import { CodeOutlined, ReadOutlined, RocketOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Space, Tag, Typography } from 'antd';

const { Title, Paragraph } = Typography;

/** Icon 字符串 → 组件映射 */
const iconMap: Record<string, React.ReactNode> = {
  CodeOutlined: <CodeOutlined className="text-2xl text-primary-500" />,
  TeamOutlined: <TeamOutlined className="text-2xl text-primary-500" />,
  ReadOutlined: <ReadOutlined className="text-2xl text-primary-500" />,
  RocketOutlined: <RocketOutlined className="text-2xl text-primary-500" />,
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  tag?: { text: string; color: string };
}

/** 首页功能卡片 */
export default function FeatureCard({ icon, title, description, tag }: FeatureCardProps) {
  return (
    <Card hoverable>
      <Space>
        {iconMap[icon] || <CodeOutlined className="text-2xl text-primary-500" />}
        <div>
          <Title level={4} className="!mb-1">
            {title}
          </Title>
          <Paragraph className="!mb-0 text-gray-500">{description}</Paragraph>
        </div>
        {tag && <Tag color={tag.color}>{tag.text}</Tag>}
      </Space>
    </Card>
  );
}
