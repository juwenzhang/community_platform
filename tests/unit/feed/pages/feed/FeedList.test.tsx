import FeedList from '@feed/pages/feed/components/FeedList';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('FeedList', () => {
  it('应渲染 3 条 feed 数据', () => {
    render(<FeedList />);

    expect(screen.getByText('Luhanxin')).toBeInTheDocument();
    expect(screen.getByText('RustDev')).toBeInTheDocument();
    expect(screen.getByText('ProtoBuf Fan')).toBeInTheDocument();
  });

  it('应渲染 feed 内容', () => {
    render(<FeedList />);

    expect(screen.getByText(/微前端架构搭建/)).toBeInTheDocument();
    expect(screen.getByText(/Tonic gRPC/)).toBeInTheDocument();
    expect(screen.getByText(/Connect Protocol/)).toBeInTheDocument();
  });

  it('应渲染标签', () => {
    render(<FeedList />);

    expect(screen.getByText('微前端')).toBeInTheDocument();
    expect(screen.getByText('Garfish')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('应渲染点赞和评论数', () => {
    render(<FeedList />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('应渲染时间信息', () => {
    render(<FeedList />);

    expect(screen.getByText('2 小时前')).toBeInTheDocument();
    expect(screen.getByText('5 小时前')).toBeInTheDocument();
    expect(screen.getByText('1 天前')).toBeInTheDocument();
  });

  it('每条 feed 应包含头像', () => {
    const { container } = render(<FeedList />);

    const avatars = container.querySelectorAll('.ant-avatar');
    expect(avatars.length).toBe(3);
  });
});
