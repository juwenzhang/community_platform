import type { ReactNode } from 'react';

export interface CustomContainerProps {
  /** 容器类型 */
  kind: 'tip' | 'warning' | 'info' | 'danger';
  /** 标题（可选） */
  title?: string;
  /** 子内容 */
  children: ReactNode;
}

/**
 * 自定义容器组件
 * 支持 tip/warning/info/danger 四种类型
 */
export function CustomContainer({ kind, title, children }: CustomContainerProps) {
  const iconMap = {
    tip: '💡',
    warning: '⚠️',
    info: 'ℹ️',
    danger: '🚫',
  };

  const defaultTitleMap = {
    tip: '提示',
    warning: '警告',
    info: '信息',
    danger: '危险',
  };

  return (
    <div className={`custom-container ${kind}`}>
      <div className="container-title">
        <span className="container-icon">{iconMap[kind]}</span>
        <span>{title || defaultTitleMap[kind]}</span>
      </div>
      <div className="container-content">{children}</div>
    </div>
  );
}
