import { UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Skeleton } from 'antd';
import { Suspense, useEffect } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';

import ArticleList from '@/components/ArticleList';
import Loading from '@/components/Loading';
import { useUserStore } from '@/stores/useUserStore';
import styles from './user.module.less';

function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const {
    profileUser: user,
    profileLoading: loading,
    profileError: error,
    fetchUserByUsername,
    clearProfile,
  } = useUserStore();

  useEffect(() => {
    if (username) fetchUserByUsername(username);
    return () => clearProfile();
  }, [username, fetchUserByUsername, clearProfile]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton active avatar paragraph={{ rows: 3 }} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p>{error || '用户不存在'}</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(Number(user.createdAt.seconds) * 1000).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <div className={styles.page}>
      <div className={styles.profileCard}>
        <Avatar
          src={user.avatarUrl || undefined}
          icon={!user.avatarUrl ? <UserOutlined /> : undefined}
          size={72}
          className={styles.avatar}
        />
        <div className={styles.info}>
          <h1 className={styles.displayName}>{user.displayName || user.username}</h1>
          <p className={styles.username}>@{user.username}</p>
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
          <div className={styles.meta}>
            {user.company && <span>{user.company}</span>}
            {user.location && <span>{user.location}</span>}
            {joinDate && <span>{joinDate} 加入</span>}
          </div>
        </div>
      </div>

      <div className={styles.articles}>
        <h2 className={styles.articlesTitle}>发布的文章</h2>
        <ArticleList authorId={user.id} />
      </div>
    </div>
  );
}

/** 用户模块入口 — 子路由分发 */
export default function UserModule() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path=":username" element={<UserProfilePage />} />
      </Routes>
    </Suspense>
  );
}
