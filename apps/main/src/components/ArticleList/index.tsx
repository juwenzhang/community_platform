import { createClient } from '@connectrpc/connect';
import type { Article } from '@luhanxin/shared-types';
import { ArticleService, ArticleStatus } from '@luhanxin/shared-types';
import { Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { transport } from '@/lib/connect';
import ArticleCard from '../ArticleCard';
import styles from './articleList.module.less';

const articleClient = createClient(ArticleService, transport);

interface ArticleListProps {
  authorId?: string;
  query?: string;
  tag?: string;
  onLoad?: (totalCount: number) => void;
}

export default function ArticleList({ authorId, query, tag, onLoad }: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  // 响应 tag/authorId/query 变更时重新 fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    articleClient
      .listArticles({
        pagination: { pageSize: 20, pageToken: '' },
        authorId: authorId ?? '',
        query: query ?? '',
        tag: tag ?? '',
      })
      .then((res) => {
        if (cancelled) return;
        const visible = res.articles.filter((a) => a.status !== ArticleStatus.ARCHIVED);
        setArticles(visible);
        onLoadRef.current?.(res.pagination?.totalCount ?? visible.length);
      })
      .catch((err) => {
        if (!cancelled) console.error('ListArticles failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorId, query, tag]);

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

  if (articles.length === 0) {
    return <div className={styles.empty}>暂无文章</div>;
  }

  return (
    <div className={styles.list}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
