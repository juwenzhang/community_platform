import { useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { RouteConfig } from '@/routes';
import UserArea from '../UserArea';
import styles from './layout.module.less';

interface LayoutProps {
  routes: RouteConfig[];
}

export default function Layout({ routes }: LayoutProps) {
  const location = useLocation();
  const currentPath = `/${location.pathname.split('/')[1] || ''}`;

  // 从路由配置生成顶部导航项（过滤 hidden）
  const navItems = useMemo(
    () =>
      routes
        .filter((r) => r.meta && !r.meta.hidden)
        .map((r) => {
          const path = r.path?.replace('/*', '').replace(/\/$/, '') || '/';
          return { path, title: r.meta?.title || '' };
        }),
    [routes],
  );

  return (
    <div className={styles.layout}>
      {/* 顶栏 */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.left}>
            {/* Logo */}
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon}>L</span>
              <span className={styles.logoText}>Luhanxin</span>
            </Link>

            {/* 一级路由导航 */}
            <nav className={styles.nav}>
              {navItems.map(({ path, title }) => {
                const isActive = path === '/' ? currentPath === '/' : currentPath === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  >
                    {title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 用户区域 */}
          <UserArea />
        </div>
      </header>

      {/* 内容区 — 路由切换动画 */}
      <main className={styles.main}>
        <div key={location.pathname} className={styles.pageTransition}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
