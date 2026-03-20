import { UserOutlined } from '@ant-design/icons';
import { Empty, Typography } from 'antd';

const { Title } = Typography;

/** 个人主页 — 占位页面 */
export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Title level={2}>
        <UserOutlined className="mr-2 text-primary-500" />
        个人主页
      </Title>
      <Empty description="个人主页即将上线，敬请期待 🚧" />
    </div>
  );
}
