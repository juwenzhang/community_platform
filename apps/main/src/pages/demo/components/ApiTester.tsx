import { ApiOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Input, Space, Tag, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

interface UserInfo {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
}

/** API 请求测试器 — Demo 页面私有组件 */
export default function ApiTester() {
  const [userId, setUserId] = useState('user-123');
  const [response, setResponse] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`/api/v1/users/${userId}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        className="mt-6"
        title={
          <>
            <ApiOutlined /> 调用 UserService.GetUser
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
            <Tag color="green">Axum Gateway</Tag>
            <Tag color="orange">Tonic gRPC</Tag>
            <Tag color="purple">Protobuf</Tag>
          </div>
        </Space>
      </Card>

      {error && (
        <Alert
          className="mt-4"
          type="error"
          message="请求失败"
          description={
            <div>
              <p>{error}</p>
              <Text type="secondary" className="text-xs">
                请确保 Gateway (localhost:8000) 和 svc-user (localhost:50051) 已启动
              </Text>
            </div>
          }
          showIcon
        />
      )}

      {response && (
        <Card
          className="mt-4"
          title={
            <>
              <UserOutlined /> 用户信息 (Gateway → gRPC → svc-user)
            </>
          }
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{response.user_id}</Descriptions.Item>
            <Descriptions.Item label="用户名">{response.username}</Descriptions.Item>
            <Descriptions.Item label="显示名称">{response.display_name}</Descriptions.Item>
            <Descriptions.Item label="头像">
              <Space>
                <img src={response.avatar_url} alt="avatar" className="w-10 h-10 rounded-full" />
                <Text type="secondary" className="text-xs">
                  {response.avatar_url}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="简介">{response.bio}</Descriptions.Item>
          </Descriptions>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" className="text-xs">
              完整链路验证通过！数据流向：
            </Text>
            <div className="mt-1 text-xs text-gray-600 font-mono">
              React → fetch(/api/v1/users/{'{id}'}) → Vite Proxy → Gateway:8000 → gRPC →
              svc-user:50051 → Mock Data
            </div>
            <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded border">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </>
  );
}
