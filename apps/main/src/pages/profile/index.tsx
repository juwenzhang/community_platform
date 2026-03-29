import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Loading from '@/components/Loading';

const ProfileSettings = lazy(() => import('./components/ProfileSettings'));
const ManagePage = lazy(() => import('./pages/manage'));

/** 个人中心模块入口 — 子路由分发 */
export default function ProfileModule() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<ProfileSettings />} />
        <Route path="manage" element={<ManagePage />} />
      </Routes>
    </Suspense>
  );
}
