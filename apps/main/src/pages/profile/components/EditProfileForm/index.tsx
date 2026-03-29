import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { ConnectError } from '@connectrpc/connect';
import type { User } from '@luhanxin/shared-types';
import { Alert, Button, Form, Input, message, Select } from 'antd';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from '../../profile.module.less';

const { TextArea } = Input;

/** 可选的社交平台列表 */
const PLATFORM_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'weibo', label: '微博' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'juejin', label: '掘金' },
  { value: 'zhihu', label: '知乎' },
  { value: 'bilibili', label: 'B站' },
  { value: 'website', label: '个人网站' },
];

const MAX_SOCIAL_LINKS = 10;

interface SocialLinkInput {
  _key: string;
  platform: string;
  url: string;
}

let socialKeyCounter = 0;
function nextSocialKey() {
  socialKeyCounter += 1;
  return `sl-${socialKeyCounter}`;
}

interface EditProfileFormProps {
  user: User;
  onSuccess?: () => void;
}

export default function EditProfileForm({ user, onSuccess }: EditProfileFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateUser = useAuthStore((s) => s.updateUser);

  // 社交链接动态列表
  const [socialLinks, setSocialLinks] = useState<SocialLinkInput[]>([]);

  // 用完整 user 数据初始化所有字段（全量覆盖语义保障）
  useEffect(() => {
    form.setFieldsValue({
      displayName: user.displayName || '',
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
    });
    setSocialLinks(
      user.socialLinks?.map((l) => ({ _key: nextSocialKey(), platform: l.platform, url: l.url })) ||
        [],
    );
  }, [user, form]);

  const handleAddLink = () => {
    if (socialLinks.length >= MAX_SOCIAL_LINKS) {
      message.warning(`最多添加 ${MAX_SOCIAL_LINKS} 条社交链接`);
      return;
    }
    setSocialLinks([...socialLinks, { _key: nextSocialKey(), platform: 'github', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleSubmit = async (values: {
    displayName: string;
    avatarUrl: string;
    bio: string;
    company: string;
    location: string;
    website: string;
  }) => {
    // URL 校验
    for (const link of socialLinks) {
      if (link.url && !link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        setError(`社交链接 URL 格式错误：${link.url}，需以 http:// 或 https:// 开头`);
        return;
      }
    }
    if (
      values.website &&
      !values.website.startsWith('http://') &&
      !values.website.startsWith('https://')
    ) {
      setError('个人网站 URL 需以 http:// 或 https:// 开头');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import('@connectrpc/connect');
      const { UserService } = await import('@luhanxin/shared-types');
      const { transport } = await import('@/lib/connect');

      const client = createClient(UserService, transport);
      const resp = await client.updateProfile({
        displayName: values.displayName || '',
        avatarUrl: values.avatarUrl || '',
        bio: values.bio || '',
        company: values.company || '',
        location: values.location || '',
        website: values.website || '',
        socialLinks: socialLinks.filter((l) => l.url.trim()),
      });

      message.success('资料已更新');
      if (resp.user) {
        updateUser(resp.user);
      }
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
    <div className={styles.editForm}>
      <h3 className={styles.editTitle}>编辑资料</h3>

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
          <Input placeholder="你希望别人怎么称呼你" maxLength={100} className={styles.input} />
        </Form.Item>

        <Form.Item label="头像 URL" name="avatarUrl">
          <Input placeholder="https://example.com/avatar.jpg" className={styles.input} />
        </Form.Item>

        <Form.Item label="个人简介" name="bio">
          <TextArea
            placeholder="介绍一下你自己...（支持 Markdown）"
            maxLength={500}
            rows={3}
            showCount
            className={styles.input}
          />
        </Form.Item>

        <Form.Item label="公司/组织" name="company">
          <Input placeholder="你在哪里工作" maxLength={100} className={styles.input} />
        </Form.Item>

        <Form.Item label="所在地" name="location">
          <Input placeholder="你在哪个城市" maxLength={100} className={styles.input} />
        </Form.Item>

        <Form.Item label="个人网站" name="website">
          <Input placeholder="https://yoursite.com" maxLength={255} className={styles.input} />
        </Form.Item>

        {/* 社交链接编辑器 */}
        <div className={styles.socialSection}>
          <div className={styles.socialHeader}>
            <span className={styles.socialLabel}>社交链接</span>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddLink}
              disabled={socialLinks.length >= MAX_SOCIAL_LINKS}
            >
              添加链接
            </Button>
          </div>
          {socialLinks.map((link, index) => (
            <div key={link._key} className={styles.socialRow}>
              <Select
                value={link.platform}
                onChange={(val) => handleLinkChange(index, 'platform', val)}
                options={PLATFORM_OPTIONS}
                style={{ width: 120 }}
                size="small"
              />
              <Input
                value={link.url}
                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                placeholder="https://..."
                size="small"
                className={styles.socialInput}
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveLink(index)}
              />
            </div>
          ))}
        </div>

        <Form.Item className="mb-0" style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            className={styles.saveBtn}
          >
            保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
