import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const DetailPage = lazy(() => import('./pages/detail'));
const EditPage = lazy(() => import('./pages/edit'));

/** 文章模块入口 — 子路由分发 */
export default function PostModule() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
          加载中...
        </div>
      }
    >
      <Routes>
        <Route path=":id" element={<DetailPage />} />
        <Route path=":id/edit" element={<EditPage />} />
      </Routes>
    </Suspense>
  );
}
