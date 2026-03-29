import { EditOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import ArticleList from '../article/components/ArticleList';

import EditProfileForm from './components/EditProfileForm';
import ProfileCard from './components/ProfileCard';
import styles from './profile.module.less';

export default function ProfilePage() {
  const { user, isLoading } = useAuthStore();
  const [editing, setEditing] = useState(false);

  if (!user && !isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <Empty description="请先登录" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>个人设置</h2>
        <Button
          type={editing ? 'default' : 'primary'}
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditing(!editing)}
        >
          {editing ? '取消编辑' : '编辑资料'}
        </Button>
      </div>

      <div className={styles.body}>
        <ProfileCard user={user} loading={isLoading} />
        {editing && user && <EditProfileForm user={user} onSuccess={() => setEditing(false)} />}
      </div>

      {user && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📝 我的文章</h3>
          <ArticleList authorId={user.id} />
        </div>
      )}
    </div>
  );
}
