import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { ConnectError } from '@connectrpc/connect';
import { Alert, Button, Form, Input, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const handleSubmit = async (values: RegisterFormValues) => {
    setError(null);
    try {
      await register(values.username, values.email, values.password);
      message.success('注册成功');
      navigate('/');
    } catch (e) {
      if (e instanceof ConnectError) {
        setError(e.message);
      } else {
        setError('注册失败，请稍后重试');
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

      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, max: 20, message: '3-20 个字符' },
          { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, message: '字母或数字开头' },
        ]}
      >
        <Input
          prefix={<UserOutlined className="text-[#8a919f]" />}
          placeholder="用户名"
          className="rounded"
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效邮箱' },
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-[#8a919f]" />}
          placeholder="邮箱"
          className="rounded"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 8, max: 72, message: '8-72 个字符' },
          { pattern: /(?=.*[a-zA-Z])(?=.*\d)/, message: '需包含字母和数字' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-[#8a919f]" />}
          placeholder="密码"
          className="rounded"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) return Promise.resolve();
              return Promise.reject(new Error('两次密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-[#8a919f]" />}
          placeholder="确认密码"
          className="rounded"
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          className="rounded bg-[#1e80ff] border-[#1e80ff] h-10"
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  );
}
