import { UserOutlined } from '@ant-design/icons';
import { createClient } from '@connectrpc/connect';
import type { User } from '@luhanxin/shared-types';
import { UserService } from '@luhanxin/shared-types';
import { Avatar, Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { transport } from '@/lib/connect';
import styles from './userList.module.less';

const userClient = createClient(UserService, transport);

interface UserListProps {
  onLoad?: (totalCount: number) => void;
}

export default function UserList({ onLoad }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    userClient
      .listUsers({ query: '', pagination: { pageSize: 20, pageToken: '' } })
      .then((res) => {
        setUsers(res.users);
        onLoad?.(res.pagination?.totalCount ?? res.users.length);
      })
      .catch((err) => console.error('ListUsers failed:', err))
      .finally(() => setLoading(false));
  }, [onLoad]);

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonItem}>
            <Skeleton avatar={{ size: 36 }} active paragraph={{ rows: 1, width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return <div className={styles.empty}>暂无用户</div>;
  }

  return (
    <div className={styles.list}>
      {users.map((user) => (
        <button
          type="button"
          key={user.id}
          className={styles.item}
          onClick={() => navigate(`/user/${user.username}`)}
        >
          <Avatar
            src={user.avatarUrl || undefined}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            size={36}
          />
          <div className={styles.info}>
            <div className={styles.name}>{user.displayName || user.username}</div>
            {user.bio ? (
              <p className={styles.bio}>{user.bio}</p>
            ) : (
              <p className={styles.username}>@{user.username}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
