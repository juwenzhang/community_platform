import Garfish from 'garfish';
import { useEffect, useRef } from 'react';

interface GarfishContainerProps {
  appName: string;
}

// Garfish 子应用配置
const subApps: Record<string, { entry: string; activeWhen: string }> = {
  feed: {
    entry: 'http://localhost:5174',
    activeWhen: '/feed',
  },
};

let garfishInitialized = false;

export default function GarfishContainer({ appName }: GarfishContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (garfishInitialized) return;

    const appConfig = subApps[appName];
    if (!appConfig) return;

    garfishInitialized = true;

    Garfish.run({
      basename: '/',
      domGetter: '#garfish-container',
      apps: Object.entries(subApps).map(([name, config]) => ({
        name,
        entry: config.entry,
        activeWhen: config.activeWhen,
      })),
    });

    return () => {
      // Cleanup handled by Garfish internally
    };
  }, [appName]);

  return <div id="garfish-container" ref={containerRef} className="min-h-[400px]" />;
}
