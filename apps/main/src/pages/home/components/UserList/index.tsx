import { UserOutlined } from '@ant-design/icons';
import { createClient } from '@connectrpc/connect';
import type { User } from '@luhanxin/shared-types';
import { UserService } from '@luhanxin/shared-types';
import { Avatar, Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { transport } from '@/lib/connect';
import styles from './userList.module.less';

const userClient = createClient(UserService, transport);

interface UserListProps {
  onLoad?: (totalCount: number) => void;
  /** 紧凑模式（侧边栏用，只显示 5 个，小头像） */
  compact?: boolean;
}

export default function UserList({ onLoad, compact }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    userClient
      .listUsers({ query: '', pagination: { pageSize: compact ? 5 : 20, pageToken: '' } })
      .then((res) => {
        setUsers(res.users);
        onLoad?.(res.pagination?.totalCount ?? res.users.length);
      })
      .catch((err) => console.error('ListUsers failed:', err))
      .finally(() => setLoading(false));
  }, [onLoad, compact]);

  if (loading) {
    return (
      <div className={compact ? undefined : styles.skeleton}>
        {['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e'].slice(0, compact ? 3 : 5).map((key) => (
          <div key={key} className={compact ? undefined : styles.skeletonItem}>
            <Skeleton
              avatar={{ size: compact ? 24 : 36 }}
              active
              paragraph={{ rows: compact ? 0 : 1, width: '60%' }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return <div className={styles.empty}>暂无用户</div>;
  }

  return (
    <div className={compact ? styles.compactList : styles.list}>
      {users.map((user) => (
        <button
          type="button"
          key={user.id}
          className={compact ? styles.compactItem : styles.item}
          onClick={() => navigate(`/user/${user.username}`)}
        >
          <Avatar
            src={user.avatarUrl || undefined}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            size={compact ? 24 : 36}
          />
          <div className={styles.info}>
            <div className={styles.name}>{user.displayName || user.username}</div>
            {!compact &&
              (user.bio ? (
                <p className={styles.bio}>{user.bio}</p>
              ) : (
                <p className={styles.username}>@{user.username}</p>
              ))}
          </div>
        </button>
      ))}
    </div>
  );
}
