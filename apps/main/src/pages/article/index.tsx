import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import styles from './article.module.less';
import ArticleList from './components/ArticleList';
import ArticleSidebar from './components/ArticleSidebar';

const DetailPage = lazy(() => import('./pages/detail'));
const CreatePage = lazy(() => import('./pages/create'));
const EditPage = lazy(() => import('./pages/edit'));

/** 文章模块入口 — 带侧边栏的子路由布局 */
export default function ArticlePage() {
  const location = useLocation();
  const path = location.pathname;

  // 编辑器页面（create/edit）使用全宽布局，不显示侧边栏
  const isEditorPage = path === '/article/create' || path.endsWith('/edit');

  return (
    <div className={isEditorPage ? styles.fullPage : styles.page}>
      {!isEditorPage && <ArticleSidebar />}
      <div className={isEditorPage ? styles.fullContent : styles.content}>
        <Suspense fallback={<div className={styles.loading}>加载中...</div>}>
          <Routes>
            <Route index element={<ArticleList />} />
            <Route path="create" element={<CreatePage />} />
            <Route path=":id" element={<DetailPage />} />
            <Route path=":id/edit" element={<EditPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
