import { createClient } from '@connectrpc/connect';
import type { AuthResponse, User } from '@luhanxin/shared-types';
import { UserService } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { transport } from '@/lib/connect';

const TOKEN_KEY = 'luhanxin_auth_token';

const userClient = createClient(UserService, transport);

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** 用户登录 */
  login: (username: string, password: string) => Promise<void>;
  /** 用户注册 */
  register: (username: string, email: string, password: string) => Promise<void>;
  /** 登出 */
  logout: () => void;
  /** 从 token 恢复用户状态（页面刷新时调用） */
  restore: () => Promise<void>;
}

/** 保存认证响应到 state + localStorage */
function handleAuthResponse(set: (partial: Partial<AuthState>) => void, resp: AuthResponse) {
  const { token, user } = resp;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  set({
    token: token || null,
    user: user || null,
    isAuthenticated: !!token,
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const resp = await userClient.login({ username, password });
      handleAuthResponse(set, resp);
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const resp = await userClient.register({ username, email, password });
      handleAuthResponse(set, resp);
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  restore: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    set({ isLoading: true });
    try {
      const resp = await userClient.getCurrentUser({});
      set({
        token,
        user: resp.user || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Token 无效，清除
      localStorage.removeItem(TOKEN_KEY);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
