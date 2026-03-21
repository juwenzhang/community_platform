import { registryToRoutes } from '@luhanxin/app-registry/adapters';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { registry } from './lib/registry';
import type { RouteConfig } from './routes';
import { renderRoutes } from './routes/renderRoutes';
import { getRoutes } from './routes/routes';

function App() {
  const [ready, setReady] = useState(false);
  const [routes, setRoutes] = useState<RouteConfig[]>([]);

  useEffect(() => {
    registry
      .init()
      .then(() => {
        // 从注册表生成微前端路由，与本地路由合并
        const microRoutes = registryToRoutes(registry).map(
          (r): RouteConfig => ({
            path: r.path,
            garfish: r.garfish,
            meta: r.meta,
          }),
        );
        setRoutes(getRoutes(microRoutes));
        setReady(true);
      })
      .catch((err) => {
        console.error('[App] Registry init failed:', err);
        // 降级：使用本地路由（不含微前端）
        setRoutes(getRoutes());
        setReady(true);
      });

    return () => {
      registry.destroy();
    };
  }, []);

  if (!ready) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout routes={routes} />}>
          {renderRoutes(routes)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
