import { ThunderboltOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import ApiTester from './components/ApiTester';

const { Title, Text } = Typography;

/** 端到端 Demo 页面 */
export default function DemoPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Title level={2}>
        <ThunderboltOutlined className="mr-2 text-primary-500" />
        端到端 Demo
      </Title>
      <Text type="secondary" className="text-base">
        前端 (React) → HTTP → Gateway (Axum) → gRPC → svc-user (Tonic) → Protobuf 响应
      </Text>

      <ApiTester />
    </div>
  );
}
