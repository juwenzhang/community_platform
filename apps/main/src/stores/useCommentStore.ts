import { createClient } from '@connectrpc/connect';
import type { Comment } from '@luhanxin/shared-types';
import { CommentService } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { antdMessage } from '@/lib/antdStatic';
import { transport } from '@/lib/connect';

const commentClient = createClient(CommentService, transport);

interface CommentState {
  // 数据
  comments: Comment[];
  totalCount: number;
  loading: boolean;
  submitting: boolean;

  // Actions
  loadComments: (articleId: string) => Promise<void>;
  createComment: (params: {
    articleId: string;
    content: string;
    parentId?: string;
    replyToId?: string;
  }) => Promise<boolean>;
  deleteComment: (commentId: string, articleId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  comments: [],
  totalCount: 0,
  loading: true,
  submitting: false,
};

export const useCommentStore = create<CommentState>((set, get) => ({
  ...initialState,

  loadComments: async (articleId) => {
    set({ loading: true });
    try {
      const res = await commentClient.listComments({
        articleId,
        pagination: { pageSize: 50, pageToken: '' },
      });
      set({
        comments: res.comments,
        totalCount: res.pagination?.totalCount ?? 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createComment: async ({ articleId, content, parentId, replyToId }) => {
    set({ submitting: true });
    try {
      await commentClient.createComment({
        articleId,
        content: content.trim(),
        parentId: parentId ?? '',
        replyToId: replyToId ?? '',
      });
      antdMessage.success('评论成功');
      set({ submitting: false });
      // 重新加载评论列表
      get().loadComments(articleId);
      return true;
    } catch (err) {
      antdMessage.error(err instanceof Error ? err.message : '评论失败');
      set({ submitting: false });
      return false;
    }
  },

  deleteComment: async (commentId, articleId) => {
    try {
      await commentClient.deleteComment({ commentId });
      antdMessage.success('已删除');
      get().loadComments(articleId);
    } catch (err) {
      antdMessage.error(err instanceof Error ? err.message : '删除失败');
    }
  },

  reset: () => set(initialState),
}));
