/**
 * useUserStore — 用户查询 Store
 *
 * 管理用户列表查询和单用户查询的状态。
 * 与 useAuthStore（认证状态）分离，各司其职：
 * - useAuthStore：登录/注册/当前用户状态
 * - useUserStore：用户列表/用户详情查询
 */

import type { User } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { userClient } from '@/lib/grpc-clients';

interface UserState {
  // 用户列表
  users: User[];
  usersTotalCount: number;
  usersLoading: boolean;

  // 单用户详情（按 username 查询）
  profileUser: User | null;
  profileLoading: boolean;
  profileError: string | null;

  // Actions
  fetchUsers: (params?: { query?: string; pageSize?: number }) => Promise<void>;
  fetchUserByUsername: (username: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  usersTotalCount: 0,
  usersLoading: true,

  profileUser: null,
  profileLoading: true,
  profileError: null,

  fetchUsers: async (params) => {
    set({ usersLoading: true });
    try {
      const res = await userClient.listUsers({
        query: params?.query ?? '',
        pagination: {
          pageSize: params?.pageSize ?? 20,
          pageToken: '',
        },
      });
      set({
        users: res.users,
        usersTotalCount: res.pagination?.totalCount ?? res.users.length,
        usersLoading: false,
      });
    } catch (err) {
      console.error('ListUsers failed:', err);
      set({ usersLoading: false });
    }
  },

  fetchUserByUsername: async (username) => {
    set({ profileLoading: true, profileError: null, profileUser: null });
    try {
      const res = await userClient.getUserByUsername({ username });
      if (res.user) {
        set({ profileUser: res.user, profileLoading: false });
      } else {
        set({ profileError: '用户不存在', profileLoading: false });
      }
    } catch {
      set({ profileError: '加载失败', profileLoading: false });
    }
  },

  clearProfile: () => {
    set({ profileUser: null, profileError: null, profileLoading: true });
  },
}));
