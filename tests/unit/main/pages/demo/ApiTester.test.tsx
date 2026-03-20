import ApiTester from '@main/pages/demo/components/ApiTester';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ApiTester', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应渲染输入框和发送按钮', () => {
    render(<ApiTester />);

    expect(screen.getByPlaceholderText('输入 User ID')).toBeInTheDocument();
    expect(screen.getByText('发送请求')).toBeInTheDocument();
  });

  it('输入框默认值应为 user-123', () => {
    render(<ApiTester />);

    const input = screen.getByPlaceholderText('输入 User ID') as HTMLInputElement;
    expect(input.value).toBe('user-123');
  });

  it('应渲染技术栈标签', () => {
    render(<ApiTester />);

    expect(screen.getByText('React 18')).toBeInTheDocument();
    expect(screen.getByText('Axum Gateway')).toBeInTheDocument();
    expect(screen.getByText('Tonic gRPC')).toBeInTheDocument();
    expect(screen.getByText('Protobuf')).toBeInTheDocument();
  });

  it('请求成功时应显示用户信息', async () => {
    const mockUserData = {
      user_id: 'user-123',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
      bio: '这是一个测试用户',
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUserData),
    } as Response);

    render(<ApiTester />);

    fireEvent.click(screen.getByText('发送请求'));

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试用户')).toBeInTheDocument();
  });

  it('请求失败时应显示错误信息', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: '服务器内部错误' }),
    } as unknown as Response);

    render(<ApiTester />);

    fireEvent.click(screen.getByText('发送请求'));

    await waitFor(() => {
      expect(screen.getByText('请求失败')).toBeInTheDocument();
    });

    expect(screen.getByText('服务器内部错误')).toBeInTheDocument();
  });

  it('网络错误时应显示错误信息', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Error'));

    render(<ApiTester />);

    fireEvent.click(screen.getByText('发送请求'));

    await waitFor(() => {
      expect(screen.getByText('请求失败')).toBeInTheDocument();
    });

    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('应使用输入的 User ID 发起请求', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user_id: 'custom-456',
          username: 'custom',
          display_name: 'Custom',
          avatar_url: '',
          bio: '',
        }),
    } as Response);

    render(<ApiTester />);

    const input = screen.getByPlaceholderText('输入 User ID');
    fireEvent.change(input, { target: { value: 'custom-456' } });
    fireEvent.click(screen.getByText('发送请求'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/users/custom-456');
    });
  });
});
