import { getGarfishApps } from '@luhanxin/app-registry/adapters';
import Garfish from 'garfish';
import { useEffect, useRef } from 'react';
import { registry } from '@/lib/registry';

interface GarfishContainerProps {
  appName: string;
}

let garfishInitialized = false;

export default function GarfishContainer({ appName }: GarfishContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (garfishInitialized) return;

    // 从注册表解析子应用配置
    const app = registry.resolve(appName);
    if (!app) {
      console.warn(`[GarfishContainer] App "${appName}" not found in registry`);
      return;
    }

    garfishInitialized = true;

    // 从注册表获取所有 Garfish 子应用配置
    const garfishApps = getGarfishApps(registry);

    Garfish.run({
      basename: '/',
      domGetter: '#garfish-container',
      // Garfish VM 沙箱通过 eval() 执行脚本，不支持 ESM 的 import/export 语法。
      // Vite 构建产物默认为 ESM 格式（dev 和 production 均如此），
      // 因此需要关闭 VM 沙箱。样式隔离仍由 CSS Modules / Tailwind scoping 保障。
      sandbox: { open: false },
      apps: garfishApps,
    });

    return () => {
      // Cleanup handled by Garfish internally
    };
  }, [appName]);

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

  return <div id="garfish-container" ref={containerRef} className="min-h-[400px]" />;
}
