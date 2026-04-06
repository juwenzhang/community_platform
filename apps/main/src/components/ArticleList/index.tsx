import type { Article } from '@luhanxin/shared-types';
import { ArticleStatus } from '@luhanxin/shared-types';
import { Skeleton, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { articleClient } from '@/lib/grpc-clients';
import ArticleCard from '../ArticleCard';
import styles from './articleList.module.less';

interface ArticleListProps {
  authorId?: string;
  query?: string;
  tag?: string;
  categories?: number[];
  sort?: number;
  pageSize?: number;
  onLoad?: (totalCount: number) => void;
}

/**
 * ArticleList — 独立数据获取的文章列表组件
 *
 * 每个 ArticleList 实例维护自己的 articles 状态，
 * 不依赖全局 store，避免多实例（首页/用户主页/管理页）互相污染。
 */
export default function ArticleList({
  authorId,
  query,
  tag,
  categories,
  sort,
  pageSize = 20,
  onLoad,
}: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();

  // 请求参数 ref（IntersectionObserver 回调中使用）
  const paramsRef = useRef({ tag, authorId, query, categories, sort, pageSize });
  paramsRef.current = { tag, authorId, query, categories, sort, pageSize };

  // 初始加载 + 参数变化时重新加载
  const hasDataRef = useRef(false);

  const fetchList = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // 有旧数据时用 refreshing（保留旧内容），无数据时用 loading（骨架屏）
    if (hasDataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await articleClient.listArticles(
        {
          pagination: { pageSize, pageToken: '' },
          authorId: authorId ?? '',
          query: query ?? '',
          tag: tag ?? '',
          categories: categories ?? [],
          sort: sort ?? 0,
        },
        { signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;

      const nextToken = res.pagination?.nextPageToken ?? '';
      setArticles(res.articles);
      hasDataRef.current = res.articles.length > 0;
      setTotalCount(res.pagination?.totalCount ?? res.articles.length);
      setNextPageToken(nextToken);
      setHasMore(nextToken !== '');
    } catch {
      if (!ctrl.signal.aborted) {
        setArticles([]);
        hasDataRef.current = false;
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authorId, query, tag, sort, pageSize, categories]);

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort();
  }, [fetchList]);

  useEffect(() => {
    if (!loading && totalCount > 0) {
      onLoadRef.current?.(totalCount);
    }
  }, [loading, totalCount]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextPageToken) return;
    setLoadingMore(true);
    try {
      const p = paramsRef.current;
      const res = await articleClient.listArticles({
        pagination: { pageSize: p.pageSize, pageToken: nextPageToken },
        authorId: p.authorId ?? '',
        query: p.query ?? '',
        tag: p.tag ?? '',
        categories: p.categories ?? [],
        sort: p.sort ?? 0,
      });
      const nextToken = res.pagination?.nextPageToken ?? '';
      setArticles((prev) => [...prev, ...res.articles]);
      setNextPageToken(nextToken);
      setHasMore(nextToken !== '');
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextPageToken]);

  // IntersectionObserver 滚动加载
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((key) => (
          <div key={key} className={styles.skeletonItem}>
            <Skeleton
              active
              title={{ width: '70%' }}
              paragraph={{ rows: 2, width: ['100%', '60%'] }}
            />
          </div>
        ))}
      </div>
    );
  }

  const visible = articles.filter((a) => a.status !== ArticleStatus.ARCHIVED);

  if (visible.length === 0) {
    return <div className={styles.empty}>暂无文章</div>;
  }

  return (
    <div className={`${styles.list} ${refreshing ? styles.refreshing : ''}`}>
      {visible.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}

      {/* 滚动加载哨兵 */}
      <div ref={sentinelRef} className={styles.sentinel}>
        {loadingMore && <Spin size="small" />}
        {!hasMore && articles.length > 0 && <span className={styles.noMore}>没有更多了</span>}
      </div>
    </div>
  );
}
