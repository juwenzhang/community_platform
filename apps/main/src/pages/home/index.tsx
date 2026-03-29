import { useCallback, useState } from 'react';

import HeroBanner from './components/HeroBanner';
import UserList from './components/UserList';
import styles from './home.module.less';

export default function HomePage() {
  const [userCount, setUserCount] = useState<number | null>(null);

  const handleUserListLoad = useCallback((totalCount: number) => {
    setUserCount(totalCount);
  }, []);

  return (
    <div className={styles.page}>
      {/* 主内容 */}
      <div className={styles.content}>
        <div className={styles.tabs}>
          <div className={styles.tabList}>
            <span className={`${styles.tab} ${styles.active}`}>推荐</span>
            <span className={`${styles.tab} ${styles.disabled}`}>最新</span>
          </div>
        </div>
        <UserList onLoad={handleUserListLoad} />
      </div>

      {/* 右侧栏 */}
      <div className={styles.sidebar}>
        <HeroBanner />

        <div className={styles.card}>
          <h4 className={styles.cardTitle}>📊 社区数据</h4>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>注册用户</span>
            <span className={styles.statValue}>{userCount ?? '-'}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>技术文章</span>
            <span className={styles.statPlaceholder}>即将上线</span>
          </div>
        </div>

        <div className={styles.card}>
          <h4 className={styles.cardTitle}>🏷️ 技术栈</h4>
          <div className={styles.tags}>
            {['React', 'Vue', 'Rust', 'gRPC', 'PostgreSQL', 'Garfish'].map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          Luhanxin Community
          <br />
          React 18 · Vue 3 · Rust · Axum · Tonic
        </div>
      </div>
    </div>
  );
}
