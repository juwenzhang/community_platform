import { ApiOutlined, UserOutlined } from '@ant-design/icons';
import { ConnectError, createClient } from '@connectrpc/connect';
import type { GetUserRequest, User } from '@luhanxin/shared-types';
import { UserService } from '@luhanxin/shared-types';
import { Alert, Button, Card, Descriptions, Input, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { transport } from '@/lib/connect';

const { Text } = Typography;

// 创建类型安全的 gRPC-Web 客户端
const userClient = createClient(UserService, transport);

// 这里需要进行对应的重构类型一下，只需要自己的一些信息吧
type RebuildGetUserRequest = Pick<GetUserRequest, 'userId'>;

/** API 请求测试器 — Demo 页面私有组件 */
export default function ApiTester() {
  const [userId, setUserId] = useState('user-123');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [requestStructure, setRequestStructure] = useState<RebuildGetUserRequest>({
    userId,
  });

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setUser(null);

    try {
      const res = await userClient.getUser(requestStructure);
      if (res.user) {
        setUser(res.user);
      } else {
        setError({ message: '用户不存在', code: 'NOT_FOUND' });
      }
    } catch (err) {
      if (err instanceof ConnectError) {
        setError({
          message: err.message,
          code: `gRPC ${err.code}`,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 监听 userId 变化，自动刷新用户信息
    if (userId) {
      setRequestStructure({
        userId,
      });
    }
  }, [userId]);

  return (
    <>
      <Card
        className="mt-6"
        title={
          <>
            <ApiOutlined /> 调用 UserService.GetUser (gRPC-Web)
          </>
        }
      >
        <Space direction="vertical" size="middle" className="w-full">
          <Space>
            <Input
              prefix={<UserOutlined />}
              placeholder="输入 User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: 300 }}
            />
            <Button type="primary" onClick={handleFetch} loading={loading}>
              发送请求
            </Button>
          </Space>

          <div className="flex gap-2 flex-wrap">
            <Tag color="blue">React 18</Tag>
            <Tag color="cyan">@connectrpc/connect-web</Tag>
            <Tag color="green">gRPC-Web</Tag>
            <Tag color="orange">Tonic + tonic-web</Tag>
            <Tag color="purple">Protobuf</Tag>
          </div>
        </Space>
      </Card>

      {error && (
        <Alert
          className="mt-4"
          type="error"
          message={<span>请求失败 {error.code && <Tag color="red">{error.code}</Tag>}</span>}
          description={
            <div>
              <p>{error.message}</p>
              <Text type="secondary" className="text-xs">
                请确保 Gateway (localhost:8000) 和 svc-user (localhost:50051) 已启动
              </Text>
            </div>
          }
          showIcon
        />
      )}

      {user && (
        <Card
          className="mt-4"
          title={
            <>
              <UserOutlined /> 用户信息 (gRPC-Web → Gateway → gRPC → svc-user)
            </>
          }
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
            <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{user.displayName}</Descriptions.Item>
            <Descriptions.Item label="头像">
              <Space>
                <img src={user.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
                <Text type="secondary" className="text-xs">
                  {user.avatarUrl}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="简介">{user.bio}</Descriptions.Item>
          </Descriptions>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" className="text-xs">
              ✅ 完整 gRPC-Web 链路验证通过！
            </Text>
            <div className="mt-1 text-xs text-gray-600 font-mono">
              React → createClient(UserService) → gRPC-Web Transport → Vite Proxy → Gateway:8000
              (tonic-web) → gRPC → svc-user:50051 → Mock Data
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <strong>类型来源：</strong> @luhanxin/shared-types (proto 生成) ·{' '}
              <strong>传输格式：</strong> application/grpc-web+proto
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
