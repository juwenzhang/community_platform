import type { Comment, MediaAttachment } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { antdMessage } from '@/lib/antdStatic';
import { commentClient } from '@/lib/grpc-clients';

/** 排序方式：0=最新, 1=最热 */
type CommentSort = 0 | 1;

const PAGE_SIZE = 15;

interface CommentState {
  comments: Comment[];
  totalCount: number;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  submitting: boolean;
  sort: CommentSort;
  cursor: string;
  hasMore: boolean;

  loadComments: (articleId: string) => Promise<void>;
  loadMore: (articleId: string) => Promise<void>;
  setSort: (sort: CommentSort, articleId: string) => void;
  createComment: (params: {
    articleId: string;
    content: string;
    parentId?: string;
    replyToId?: string;
    mediaAttachments?: MediaAttachment[];
  }) => Promise<boolean>;
  deleteComment: (commentId: string, articleId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  comments: [] as Comment[],
  totalCount: 0,
  loading: true,
  refreshing: false,
  loadingMore: false,
  submitting: false,
  sort: 0 as CommentSort,
  cursor: '',
  hasMore: false,
};

export const useCommentStore = create<CommentState>((set, get) => ({
  ...initialState,

  loadComments: async (articleId) => {
    const { sort, comments } = get();
    // 有旧数据时用 refreshing（保留旧内容），无数据时用 loading（骨架屏）
    if (comments.length > 0) {
      set({ refreshing: true, cursor: '', hasMore: false });
    } else {
      set({ loading: true, cursor: '', hasMore: false });
    }
    try {
      const res = await commentClient.listComments({
        articleId,
        pagination: { pageSize: PAGE_SIZE, pageToken: '' },
        sort,
        cursor: '',
      });
      const nextToken = res.pagination?.nextPageToken ?? '';
      set({
        comments: res.comments,
        totalCount: res.pagination?.totalCount ?? 0,
        loading: false,
        refreshing: false,
        cursor: nextToken,
        hasMore: nextToken !== '',
      });
    } catch (err) {
      console.error('[CommentStore] loadComments error:', err);
      set({ loading: false, refreshing: false });
    }
  },

  loadMore: async (articleId) => {
    const { sort, cursor, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore) return;

    set({ loadingMore: true });
    try {
      const res = await commentClient.listComments({
        articleId,
        pagination: { pageSize: PAGE_SIZE, pageToken: '' },
        sort,
        cursor,
      });
      const nextToken = res.pagination?.nextPageToken ?? '';
      set((state) => ({
        comments: [...state.comments, ...res.comments],
        loadingMore: false,
        cursor: nextToken,
        hasMore: nextToken !== '',
      }));
    } catch {
      set({ loadingMore: false });
    }
  },

  setSort: (sort, articleId) => {
    set({ sort });
    get().loadComments(articleId);
  },

  createComment: async ({ articleId, content, parentId, replyToId, mediaAttachments }) => {
    set({ submitting: true });
    try {
      await commentClient.createComment({
        articleId,
        content: content.trim(),
        parentId: parentId ?? '',
        replyToId: replyToId ?? '',
        mediaAttachments: mediaAttachments ?? [],
      });
      antdMessage.success('评论成功');
      set({ submitting: false });
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
