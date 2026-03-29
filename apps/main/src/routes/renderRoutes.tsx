import { Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import GarfishContainer from '@/components/GarfishContainer';
import Loading from '@/components/Loading';
import { useAuthStore } from '@/stores/useAuthStore';
import type { RouteConfig } from './index';

/**
 * 路由守卫 — 检查 meta.auth，未登录重定向到 /auth
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/**
 * 将路由配置数组递归渲染为 <Route> 元素
 *
 * 支持：
 * - lazy 组件 + Suspense 包裹
 * - Garfish 微前端子应用
 * - 重定向
 * - 嵌套子路由
 * - 路由守卫（meta.auth: true → AuthGuard 包裹）
 */
export function renderRoutes(routes: RouteConfig[]): React.ReactNode {
  return routes.map((route) => {
    // 重定向路由
    if (route.redirect) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={<Navigate to={route.redirect} replace />}
        />
      );
    }

    // Garfish 微前端子应用
    if (route.garfish) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={<GarfishContainer appName={route.garfish.appName} />}
        />
      );
    }

    // 普通页面组件（lazy loaded）
    if (route.component) {
      const LazyComponent = route.component;

      const routeKey = route.index ? 'index' : route.path;
      let element = (
        <Suspense key={routeKey} fallback={<Loading />}>
          <LazyComponent />
        </Suspense>
      );

      // 路由守卫：meta.auth 需要登录
      if (route.meta?.auth) {
        element = <AuthGuard>{element}</AuthGuard>;
      }

      // 带嵌套子路由
      if (route.children?.length) {
        return (
          <Route key={route.path} path={route.path} element={element}>
            {renderRoutes(route.children)}
          </Route>
        );
      }

      // index route
      if (route.index) {
        return <Route key="index" index element={element} />;
      }

      // 普通路由
      return <Route key={route.path} path={route.path} element={element} />;
    }

    return null;
  });
}
