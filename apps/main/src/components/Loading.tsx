import { Spin } from 'antd';

/** 全局加载占位组件 — 用于路由懒加载 Suspense fallback */
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spin size="large" tip="加载中..." />
    </div>
  );
}
