import { EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from './articleSidebar.module.less';

/** 文章模块侧边栏导航 */
export default function ArticleSidebar() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const path = location.pathname;

  const isListActive = path === '/article' || path === '/article/';
  const isCreateActive = path === '/article/create';

  return (
    <div className={styles.sidebar}>
      <nav className={styles.sideNav}>
        <Link
          to="/article"
          className={`${styles.sideNavItem} ${isListActive ? styles.active : ''}`}
        >
          <FileTextOutlined />
          文章列表
        </Link>
        {isAuthenticated && (
          <Link
            to="/article/create"
            className={`${styles.sideNavItem} ${isCreateActive ? styles.active : ''}`}
          >
            <EditOutlined />
            创作中心
          </Link>
        )}
      </nav>
    </div>
  );
}
