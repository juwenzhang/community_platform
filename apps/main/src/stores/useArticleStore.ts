import { createClient } from '@connectrpc/connect';
import type { Article } from '@luhanxin/shared-types';
import { ArticleService } from '@luhanxin/shared-types';
import { create } from 'zustand';

import { transport } from '@/lib/connect';

const articleClient = createClient(ArticleService, transport);

interface FetchArticlesParams {
  tag?: string;
  authorId?: string;
  query?: string;
  pageSize?: number;
  pageToken?: string;
}

interface CreateArticleData {
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  status: number;
}

interface UpdateArticleData {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  status?: number;
}

interface ArticleState {
  // 列表
  articles: Article[];
  totalCount: number;
  listLoading: boolean;
  listError: string | null;

  // 详情
  currentArticle: Article | null;
  detailLoading: boolean;
  detailError: string | null;

  // Actions
  fetchArticles: (params?: FetchArticlesParams) => Promise<void>;
  fetchArticle: (id: string) => Promise<void>;
  createArticle: (data: CreateArticleData) => Promise<Article>;
  updateArticle: (id: string, data: UpdateArticleData) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  clearCurrentArticle: () => void;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  articles: [],
  totalCount: 0,
  listLoading: false,
  listError: null,

  currentArticle: null,
  detailLoading: false,
  detailError: null,

  fetchArticles: async (params) => {
    set({ listLoading: true, listError: null });
    try {
      const res = await articleClient.listArticles({
        pagination: {
          pageSize: params?.pageSize ?? 50,
          pageToken: params?.pageToken ?? '',
        },
        authorId: params?.authorId ?? '',
        query: params?.query ?? '',
        tag: params?.tag ?? '',
      });
      set({
        articles: res.articles,
        totalCount: res.pagination?.totalCount ?? res.articles.length,
        listLoading: false,
      });
    } catch (err) {
      set({
        listError: err instanceof Error ? err.message : '加载文章列表失败',
        listLoading: false,
      });
    }
  },

  fetchArticle: async (id) => {
    set({ detailLoading: true, detailError: null, currentArticle: null });
    try {
      const res = await articleClient.getArticle({ articleId: id });
      if (res.article) {
        set({ currentArticle: res.article, detailLoading: false });
      } else {
        set({ detailError: '文章不存在', detailLoading: false });
      }
    } catch (err) {
      set({
        detailError: err instanceof Error ? err.message : '加载文章失败',
        detailLoading: false,
      });
    }
  },

  createArticle: async (data) => {
    const res = await articleClient.createArticle({
      title: data.title,
      content: data.content,
      summary: data.summary ?? '',
      tags: data.tags,
      status: data.status,
    });
    const article = res.article;
    if (!article) throw new Error('创建文章失败：服务端未返回文章');
    return article;
  },

  updateArticle: async (id, data) => {
    await articleClient.updateArticle({
      articleId: id,
      title: data.title ?? '',
      content: data.content ?? '',
      summary: data.summary ?? '',
      tags: data.tags ?? [],
      status: data.status ?? 0,
    });
    const { articles, currentArticle } = get();
    if (data.title || data.content || data.tags || data.status) {
      set({
        articles: articles.map((a) =>
          a.id === id ? ({ ...a, ...stripUndefined(data) } as Article) : a,
        ),
      });
    }
    // 同步 currentArticle
    if (currentArticle?.id === id) {
      set({ currentArticle: { ...currentArticle, ...stripUndefined(data) } as Article });
    }
  },

  deleteArticle: async (id) => {
    await articleClient.deleteArticle({ articleId: id });
    const { articles, currentArticle } = get();
    set({
      articles: articles.filter((a) => a.id !== id),
    });
    if (currentArticle?.id === id) {
      set({ currentArticle: null });
    }
  },

  clearCurrentArticle: () => {
    set({ currentArticle: null, detailError: null });
  },
}));

function stripUndefined(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
