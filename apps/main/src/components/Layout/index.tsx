import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import type { Article } from '@luhanxin/shared-types';
import { ArticleStatus } from '@luhanxin/shared-types';
import { Button, Input, Popover } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { RouteConfig } from '@/routes';
import { useArticleStore } from '@/stores/useArticleStore';
import { useAuthStore } from '@/stores/useAuthStore';
import UserArea from '../UserArea';
import styles from './layout.module.less';

interface LayoutProps {
  routes: RouteConfig[];
}

export default function Layout({ routes }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = `/${location.pathname.split('/')[1] || ''}`;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const searchArticles = useArticleStore((s) => s.searchArticles);

  // 搜索联想
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<Article[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const handleWrite = () => {
    navigate(isAuthenticated ? '/profile/manage' : '/auth');
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);

      clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setSuggestions([]);
        setSearchOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchArticles({ query: value.trim(), pageSize: 5 });
          const visible = results.filter((a) => a.status !== ArticleStatus.ARCHIVED);
          setSuggestions(visible);
          setSearchOpen(visible.length > 0);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    },
    [searchArticles],
  );

  const handleSelectArticle = (articleId: string) => {
    setSearchOpen(false);
    setSearchValue('');
    setSuggestions([]);
    navigate(`/post/${articleId}`);
  };

  const suggestionsContent = (
    <div className={styles.suggestions}>
      {suggestions.map((article) => (
        <button
          type="button"
          key={article.id}
          className={styles.suggestionItem}
          onClick={() => handleSelectArticle(article.id)}
        >
          <span className={styles.suggestionTitle}>{article.title}</span>
          {article.author && (
            <span className={styles.suggestionMeta}>
              {article.author.displayName || article.author.username}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.layout}>
      {/* 顶栏 */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.left}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon}>L</span>
              <span className={styles.logoText}>Luhanxin</span>
            </Link>

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

          {/* 右侧：搜索 + 写文章 + 用户区域 */}
          <div className={styles.right}>
            <Popover
              content={suggestionsContent}
              open={searchOpen && suggestions.length > 0}
              onOpenChange={(open) => {
                if (!open) setSearchOpen(false);
              }}
              placement="bottomRight"
              trigger="click"
              arrow={false}
              overlayStyle={{ padding: 0 }}
            >
              <Input
                placeholder="搜索文章..."
                prefix={<SearchOutlined style={{ color: 'var(--color-text-4)' }} />}
                value={searchValue}
                onChange={handleSearchChange}
                allowClear
                onClear={() => {
                  setSuggestions([]);
                  setSearchOpen(false);
                }}
                className={styles.searchInput}
              />
            </Popover>
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={handleWrite}
              className={styles.writeBtn}
            >
              写文章
            </Button>
            <UserArea />
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className={styles.main}>
        <div key={location.pathname} className={styles.pageTransition}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
