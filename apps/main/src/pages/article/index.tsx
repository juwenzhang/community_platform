import { FileTextOutlined } from '@ant-design/icons';
import { Empty, Typography } from 'antd';

const { Title } = Typography;

/** 文章模块 — 占位页面 */
export default function ArticlePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Title level={2}>
        <FileTextOutlined className="mr-2 text-primary-500" />
        技术文章
      </Title>
      <Empty description="文章模块即将上线，敬请期待 🚧" />
    </div>
  );
}
