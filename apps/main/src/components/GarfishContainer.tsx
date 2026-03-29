import { getGarfishApps } from '@luhanxin/app-registry/adapters';
import Garfish from 'garfish';
import { useEffect, useRef } from 'react';
import { registry } from '@/lib/registry';

interface GarfishContainerProps {
  appName: string;
}

let garfishInitialized = false;

/**
 * 初始化 Garfish（全局只执行一次）
 *
 * 所有子应用共享同一个 Garfish 实例，Garfish 根据 URL 自动激活/卸载子应用。
 * 每个子应用通过独立的 domGetter（`#garfish-app-{name}`）挂载到各自的 DOM 节点。
 */
function ensureGarfishInit() {
  if (garfishInitialized) return;
  garfishInitialized = true;

  const garfishApps = getGarfishApps(registry);

  // 为每个子应用设置独立的 domGetter，避免共用同一个 DOM 节点
  const appsWithDom = garfishApps.map((app) => ({
    ...app,
    domGetter: `#garfish-app-${app.name}`,
  }));

  Garfish.run({
    basename: '/',
    // domGetter 作为默认值，子应用级别的 domGetter 会覆盖
    domGetter: () => document.createElement('div'),
    sandbox: { open: false },
    apps: appsWithDom,
  });
}

export default function GarfishContainer({ appName }: GarfishContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureGarfishInit();
  }, []);

  // 未找到子应用时显示友好提示
  const app = registry.resolve(appName);
  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">子应用未注册</p>
          <p className="text-sm">"{appName}" 未在应用注册表中找到</p>
        </div>
      </div>
    );
  }

  return <div id={`garfish-app-${appName}`} ref={containerRef} className="min-h-[400px]" />;
}
