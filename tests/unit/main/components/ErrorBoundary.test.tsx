import ErrorBoundary from '@main/components/ErrorBoundary';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 组件：正常渲染
function GoodChild() {
  return <div>正常内容</div>;
}

// 组件：抛出错误
function BadChild({ error = '测试错误' }: { error?: string }): React.ReactElement {
  throw new Error(error);
}

describe('ErrorBoundary', () => {
  // 抑制 React 的 console.error（ErrorBoundary 触发时会打印大量日志）
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('正常情况下应渲染子组件', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('子组件报错时应显示错误页面', () => {
    render(
      <ErrorBoundary>
        <BadChild error="Something went wrong" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('页面出错了')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('应显示重试和返回首页按钮', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    const buttons = screen.getAllByRole('button');
    // Ant Design Button 内部 span 可能导致 textContent 含空格，标准化后比较
    const buttonTexts = buttons.map((b) => b.textContent?.replace(/\s/g, ''));
    expect(buttonTexts).toContain('重试');
    expect(buttonTexts).toContain('返回首页');
  });

  it('提供 fallback 时应使用自定义 fallback', () => {
    render(
      <ErrorBoundary fallback={<div>自定义错误提示</div>}>
        <BadChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('自定义错误提示')).toBeInTheDocument();
    expect(screen.queryByText('页面出错了')).not.toBeInTheDocument();
  });

  it('点击重试应重置错误状态并重新渲染子组件', () => {
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error('初次错误');
      }
      return <div>恢复正常</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    // 初次应显示错误
    expect(screen.getByText('页面出错了')).toBeInTheDocument();

    // 关闭错误开关
    shouldThrow = false;

    // 找到重试按钮并点击（Ant Design Button 内部 span 可能导致 textContent 含空格）
    const retryButton = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.replace(/\s/g, '') === '重试');
    expect(retryButton).toBeDefined();
    fireEvent.click(retryButton!);

    // 重试后应正常渲染
    expect(screen.getByText('恢复正常')).toBeInTheDocument();
  });
});
