import { EditOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { useState } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';

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
        <h2 className={styles.title}>我的资料</h2>
        <Button
          type={editing ? 'default' : 'primary'}
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditing(!editing)}
          className={`${styles.editBtn} ${!editing ? styles.primary : ''}`}
        >
          {editing ? '取消' : '编辑'}
        </Button>
      </div>

      <div className={styles.body}>
        <ProfileCard user={user} loading={isLoading} />
        {editing && user && <EditProfileForm user={user} onSuccess={() => setEditing(false)} />}
      </div>
    </div>
  );
}
