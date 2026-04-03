import { registryToRoutes } from '@luhanxin/app-registry/adapters';
import { App as AntdApp } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { setMessageInstance } from './lib/antdStatic';
import { registry } from './lib/registry';
import type { RouteConfig } from './routes';
import { renderRoutes } from './routes/renderRoutes';
import { getRoutes } from './routes/routes';
import { useAuthStore } from './stores/useAuthStore';

/** 在 AntdApp 内部注入全局 message 实例 */
function AntdStaticProvider({ children }: { children: React.ReactNode }) {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setMessageInstance(message);
  }, [message]);
  return <>{children}</>;
}

function App() {
  const [ready, setReady] = useState(false);
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    // 1. 恢复登录状态（从 localStorage token → GetCurrentUser）
    // 2. 初始化微前端注册表
    // 两者并行执行，都完成后才渲染
    Promise.all([
      restore(),
      registry
        .init()
        .then(() => {
          const microRoutes = registryToRoutes(registry).map(
            (r): RouteConfig => ({
              path: r.path,
              garfish: r.garfish,
              meta: r.meta,
            }),
          );
          setRoutes(getRoutes(microRoutes));
        })
        .catch((err) => {
          console.error('[App] Registry init failed:', err);
          setRoutes(getRoutes());
        }),
    ]).finally(() => setReady(true));

    return () => {
      registry.destroy();
    };
  }, [restore]);

  if (!ready) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <AntdApp>
        <AntdStaticProvider>
          <Routes>
            <Route path="/" element={<Layout routes={routes} />}>
              {renderRoutes(routes)}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AntdStaticProvider>
      </AntdApp>
    </ErrorBoundary>
  );
}

export default App;
