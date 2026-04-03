import { UserOutlined } from '@ant-design/icons';
import { Avatar, Skeleton } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUserStore } from '@/stores/useUserStore';
import styles from './userList.module.less';

interface UserListProps {
  onLoad?: (totalCount: number) => void;
  /** 紧凑模式（侧边栏用，只显示 5 个，小头像） */
  compact?: boolean;
}

export default function UserList({ onLoad, compact }: UserListProps) {
  const navigate = useNavigate();
  const { users, usersTotalCount, usersLoading, fetchUsers } = useUserStore();
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const pageSize = compact ? 5 : 20;

  useEffect(() => {
    fetchUsers({ pageSize });
  }, [fetchUsers, pageSize]);

  useEffect(() => {
    if (!usersLoading && usersTotalCount > 0) {
      onLoadRef.current?.(usersTotalCount);
    }
  }, [usersLoading, usersTotalCount]);

  if (usersLoading) {
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
