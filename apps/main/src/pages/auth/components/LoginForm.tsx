import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { ConnectError } from '@connectrpc/connect';
import { Alert, Button, Form, Input, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginForm() {
  const [form] = Form.useForm<LoginFormValues>();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await login(values.username, values.password);
      message.success('登录成功！');
      navigate('/');
    } catch (e) {
      if (e instanceof ConnectError) {
        setError(e.message);
      } else {
        setError('登录失败，请稍后重试');
      }
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} size="large" layout="vertical">
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          className="mb-4"
          onClose={() => setError(null)}
        />
      )}

      <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>

      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isLoading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}
