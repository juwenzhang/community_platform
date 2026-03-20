import { LikeOutlined, MessageOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Avatar, Card, Space, Tag, Typography } from 'antd';

const { Paragraph, Text } = Typography;

/** Mock feed 数据 */
const mockFeeds = [
  {
    id: '1',
    author: { name: 'Luhanxin', avatar: 'L' },
    content: '刚刚完成了社区平台的微前端架构搭建，使用 Garfish 作为微前端框架，体验非常不错！',
    tags: ['微前端', 'Garfish', 'React'],
    likes: 42,
    comments: 8,
    time: '2 小时前',
  },
  {
    id: '2',
    author: { name: 'RustDev', avatar: 'R' },
    content: '分享一篇关于 Tonic gRPC 在生产环境中的最佳实践，包括连接池管理、负载均衡和错误处理。',
    tags: ['Rust', 'gRPC', 'Tonic'],
    likes: 36,
    comments: 12,
    time: '5 小时前',
  },
  {
    id: '3',
    author: { name: 'ProtoBuf Fan', avatar: 'P' },
    content: '使用 Protobuf + Connect Protocol 替代 REST JSON API，类型安全性大幅提升，强烈推荐！',
    tags: ['Protobuf', 'Connect', 'TypeScript'],
    likes: 28,
    comments: 5,
    time: '1 天前',
  },
];

/** Feed 动态列表 — 页面私有组件 */
export default function FeedList() {
  return (
    <>
      {mockFeeds.map((feed) => (
        <Card key={feed.id} hoverable>
          <Space align="start">
            <Avatar style={{ backgroundColor: '#0EA5E9' }}>{feed.author.avatar}</Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Text strong>{feed.author.name}</Text>
                <Text type="secondary" className="text-xs">
                  {feed.time}
                </Text>
              </div>
              <Paragraph className="!mb-2">{feed.content}</Paragraph>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {feed.tags.map((tag) => (
                    <Tag key={tag} color="default">
                      {tag}
                    </Tag>
                  ))}
                </div>
                <Space size="middle" className="text-gray-400 text-sm">
                  <span>
                    <LikeOutlined /> {feed.likes}
                  </span>
                  <span>
                    <MessageOutlined /> {feed.comments}
                  </span>
                  <span>
                    <ShareAltOutlined />
                  </span>
                </Space>
              </div>
            </div>
          </Space>
        </Card>
      ))}
    </>
  );
}
