import { SaveOutlined } from '@ant-design/icons';
import { ConnectError } from '@connectrpc/connect';
import type { User } from '@luhanxin/shared-types';
import { Alert, Button, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';

const { TextArea } = Input;

interface EditProfileFormProps {
  user: User;
  onSuccess?: () => void;
}

export default function EditProfileForm({ user, onSuccess }: EditProfileFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    form.setFieldsValue({
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    });
  }, [user, form]);

  const handleSubmit = async (values: { displayName: string; avatarUrl: string; bio: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import('@connectrpc/connect');
      const { UserService } = await import('@luhanxin/shared-types');
      const { transport } = await import('@/lib/connect');

      const client = createClient(UserService, transport);
      await client.updateProfile({
        displayName: values.displayName || '',
        avatarUrl: values.avatarUrl || '',
        bio: values.bio || '',
      });

      message.success('资料已更新');
      await restore();
      onSuccess?.();
    } catch (e) {
      if (e instanceof ConnectError) {
        setError(e.message);
      } else {
        setError('更新失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#e4e6eb] p-6">
      <h3 className="text-base font-semibold text-[#252933] mb-4">编辑资料</h3>

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

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="显示名称" name="displayName">
          <Input placeholder="你希望别人怎么称呼你" maxLength={100} className="rounded" />
        </Form.Item>

        <Form.Item label="头像 URL" name="avatarUrl">
          <Input placeholder="https://example.com/avatar.jpg" className="rounded" />
        </Form.Item>

        <Form.Item label="个人简介" name="bio">
          <TextArea
            placeholder="介绍一下你自己..."
            maxLength={500}
            rows={3}
            showCount
            className="rounded"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            className="rounded bg-[#1e80ff] border-[#1e80ff]"
          >
            保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
