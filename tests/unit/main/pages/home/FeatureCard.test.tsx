import FeatureCard from '@main/pages/home/components/FeatureCard';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('FeatureCard', () => {
  it('应渲染标题和描述', () => {
    render(<FeatureCard icon="CodeOutlined" title="代码分享" description="分享你的代码片段" />);

    expect(screen.getByText('代码分享')).toBeInTheDocument();
    expect(screen.getByText('分享你的代码片段')).toBeInTheDocument();
  });

  it('有 tag 时应渲染标签', () => {
    render(
      <FeatureCard
        icon="TeamOutlined"
        title="社区"
        description="加入社区"
        tag={{ text: '新功能', color: 'blue' }}
      />,
    );

    expect(screen.getByText('新功能')).toBeInTheDocument();
  });

  it('无 tag 时不应渲染标签', () => {
    render(<FeatureCard icon="CodeOutlined" title="代码分享" description="分享你的代码片段" />);

    expect(screen.queryByText('新功能')).not.toBeInTheDocument();
  });

  it('未知 icon 时应使用默认 CodeOutlined', () => {
    const { container } = render(
      <FeatureCard icon="UnknownIcon" title="测试" description="测试描述" />,
    );

    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(container.querySelector('[role="img"]')).toBeInTheDocument();
  });
});
