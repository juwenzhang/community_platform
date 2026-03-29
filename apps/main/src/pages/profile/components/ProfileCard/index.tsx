import { MailOutlined, UserOutlined } from '@ant-design/icons';
import type { User } from '@luhanxin/shared-types';
import { Avatar, Skeleton } from 'antd';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import styles from '../../profile.module.less';

interface ProfileCardProps {
  user: User | null;
  loading?: boolean;
}

export default function ProfileCard({ user, loading }: ProfileCardProps) {
  if (loading || !user) {
    return (
      <div className={`${styles.profileCard} ${styles.skeleton}`}>
        <Skeleton avatar={{ size: 64 }} active paragraph={{ rows: 2 }} />
      </div>
    );
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.topBar} />
      <div className={styles.content}>
        <div className={styles.row}>
          <Avatar
            src={user.avatarUrl || undefined}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            size={64}
          />
          <div className={styles.info}>
            <h2 className={styles.name}>{user.displayName || user.username}</h2>
            <div className={styles.meta}>
              <span>@{user.username}</span>
              {user.email && (
                <span className={styles.email}>
                  <MailOutlined /> {user.email}
                </span>
              )}
            </div>
            <div className={styles.bio}>
              {user.bio ? (
                <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{user.bio}</Markdown>
              ) : (
                <p className={styles.bioEmpty}>这个人很懒，还没有写简介...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
