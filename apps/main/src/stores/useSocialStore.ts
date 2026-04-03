import { create } from 'zustand';

import { antdMessage } from '@/lib/antdStatic';
import { socialClient } from '@/lib/grpc-clients';

interface SocialState {
  liked: boolean;
  favorited: boolean;
  likeCount: number;
  favoriteCount: number;
  interactionLoading: boolean;

  getInteraction: (articleId: string) => Promise<void>;
  toggleLike: (articleId: string) => Promise<void>;
  toggleFavorite: (articleId: string) => Promise<void>;
  resetInteraction: () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  liked: false,
  favorited: false,
  likeCount: 0,
  favoriteCount: 0,
  interactionLoading: false,

  getInteraction: async (articleId) => {
    set({ interactionLoading: true });
    try {
      const res = await socialClient.getArticleInteraction({ articleId });
      set({
        liked: res.liked,
        favorited: res.favorited,
        likeCount: res.likeCount,
        favoriteCount: res.favoriteCount,
        interactionLoading: false,
      });
    } catch {
      set({ interactionLoading: false });
    }
  },

  toggleLike: async (articleId) => {
    const { liked, likeCount } = get();
    // optimistic update — 先保存旧值用于 rollback
    const prevLiked = liked;
    const prevCount = likeCount;
    set({
      liked: !liked,
      likeCount: liked ? Math.max(0, likeCount - 1) : likeCount + 1,
    });
    try {
      const res = liked
        ? await socialClient.unlikeArticle({ articleId })
        : await socialClient.likeArticle({ articleId });
      // 用服务端返回的精确值
      set({ likeCount: res.likeCount });
    } catch {
      // rollback 到旧值
      set({ liked: prevLiked, likeCount: prevCount });
      antdMessage.error('操作失败，请重试');
    }
  },

  toggleFavorite: async (articleId) => {
    const { favorited, favoriteCount } = get();
    const prevFavorited = favorited;
    const prevCount = favoriteCount;
    set({
      favorited: !favorited,
      favoriteCount: favorited ? Math.max(0, favoriteCount - 1) : favoriteCount + 1,
    });
    try {
      const res = favorited
        ? await socialClient.unfavoriteArticle({ articleId })
        : await socialClient.favoriteArticle({ articleId });
      set({ favoriteCount: res.favoriteCount });
    } catch {
      set({ favorited: prevFavorited, favoriteCount: prevCount });
      antdMessage.error('操作失败，请重试');
    }
  },

  resetInteraction: () => {
    set({
      liked: false,
      favorited: false,
      likeCount: 0,
      favoriteCount: 0,
      interactionLoading: false,
    });
  },
}));
