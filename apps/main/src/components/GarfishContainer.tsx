import { getGarfishApps } from '@luhanxin/app-registry/adapters';
import Garfish from 'garfish';
import { useEffect, useRef } from 'react';
import { registry } from '@/lib/registry';

interface GarfishContainerProps {
  appName: string;
}

const isDev = import.meta.env.DEV;
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
      apps: garfishApps.map((app) => ({
        ...app,
        // 开发模式：Vite dev server 输出 ESM，Garfish VM 沙箱不支持 import 语句
        // 关闭沙箱以避免 "Cannot use import statement outside a module" 错误
        // 生产模式：子应用构建为 UMD，可正常使用沙箱
        ...(isDev && { sandbox: { open: false } }),
      })),
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
