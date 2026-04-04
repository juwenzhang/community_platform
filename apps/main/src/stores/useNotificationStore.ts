import type { Notification } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { notificationClient } from '@/lib/grpc-clients';

interface NotificationState {
  /** 未读通知数 */
  unreadCount: number;
  /** 通知列表 */
  notifications: Notification[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 下一页 token */
  nextPageToken: string;
  /** 轮询 timer ID */
  pollTimerId: ReturnType<typeof setInterval> | null;

  /** 获取未读计数 */
  fetchUnreadCount: () => Promise<void>;
  /** 获取通知列表（首页或翻页） */
  fetchNotifications: (reset?: boolean) => Promise<void>;
  /** 标记单条已读 */
  markAsRead: (notificationId: string) => Promise<void>;
  /** 标记全部已读 */
  markAllAsRead: () => Promise<void>;
  /** 启动未读计数轮询（30s） */
  startPolling: () => void;
  /** 停止轮询 */
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  isLoading: false,
  nextPageToken: '',
  pollTimerId: null,

  fetchUnreadCount: async () => {
    try {
      const resp = await notificationClient.getUnreadCount({});
      set({ unreadCount: resp.count });
    } catch {
      // 静默失败
    }
  },

  fetchNotifications: async (reset = false) => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true });
    try {
      const resp = await notificationClient.listNotifications({
        pagination: {
          pageSize: 20,
          pageToken: reset ? '' : state.nextPageToken,
        },
      });

      const newNotifications = resp.notifications || [];
      set({
        notifications: reset ? newNotifications : [...state.notifications, ...newNotifications],
        nextPageToken: resp.pagination?.nextPageToken || '',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await notificationClient.markAsRead({ notificationId });
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {
      // 静默失败
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationClient.markAllAsRead({});
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // 静默失败
    }
  },

  startPolling: () => {
    const state = get();
    if (state.pollTimerId) return;

    // 立即执行一次
    get().fetchUnreadCount();

    const timerId = setInterval(() => {
      get().fetchUnreadCount();
    }, 30_000); // 30秒轮询

    set({ pollTimerId: timerId });
  },

  stopPolling: () => {
    const state = get();
    if (state.pollTimerId) {
      clearInterval(state.pollTimerId);
      set({ pollTimerId: null });
    }
  },
}));
