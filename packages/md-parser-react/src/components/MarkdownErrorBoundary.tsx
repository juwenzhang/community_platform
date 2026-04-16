import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface MarkdownErrorBoundaryProps {
  children: ReactNode;
  /** 自定义 fallback UI */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Markdown 专用错误边界
 *
 * 当 Mermaid/Shiki/渲染引擎出错时，显示 fallback UI 而非整组件 crash。
 */
export class MarkdownErrorBoundary extends Component<MarkdownErrorBoundaryProps, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
          }}
        >
          <strong>Markdown 渲染错误</strong>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#b91c1c' }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
