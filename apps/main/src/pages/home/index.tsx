import { useCallback, useState } from 'react';

import ArticleList from '@/components/ArticleList';
import HeroBanner from './components/HeroBanner';
import NavSidebar from './components/NavSidebar';
import UserList from './components/UserList';
import styles from './home.module.less';

export default function HomePage() {
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeSort, setActiveSort] = useState<'recommend' | 'latest'>('recommend');

  const handleArticleLoad = useCallback((totalCount: number) => {
    setArticleCount(totalCount);
  }, []);

  const handleUserListLoad = useCallback((totalCount: number) => {
    setUserCount(totalCount);
  }, []);

  return (
    <div className={styles.page}>
      {/* 左侧导航 */}
      <NavSidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      {/* 主内容：文章列表 */}
      <div className={styles.content}>
        <div className={styles.tabs}>
          <div className={styles.tabList}>
            <button
              type="button"
              className={`${styles.tab} ${activeSort === 'recommend' ? styles.active : ''}`}
              onClick={() => setActiveSort('recommend')}
            >
              推荐
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeSort === 'latest' ? styles.active : ''}`}
              onClick={() => setActiveSort('latest')}
            >
              最新
            </button>
          </div>
        </div>
        <ArticleList
          categories={activeCategory ? [activeCategory] : undefined}
          sort={activeSort === 'latest' ? 2 : 1}
          onLoad={handleArticleLoad}
        />
      </div>

      {/* 右侧栏 */}
      <div className={styles.sidebar}>
        <HeroBanner />

        <div className={styles.card}>
          <h4 className={styles.cardTitle}>📊 社区数据</h4>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>技术文章</span>
            <span className={styles.statValue}>{articleCount ?? '-'}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>注册用户</span>
            <span className={styles.statValue}>{userCount ?? '-'}</span>
          </div>
        </div>

        <div className={styles.card}>
          <h4 className={styles.cardTitle}>🔥 活跃用户</h4>
          <UserList onLoad={handleUserListLoad} compact />
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
