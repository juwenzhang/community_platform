import { createClient } from '@connectrpc/connect';
import type { Article } from '@luhanxin/shared-types';
import { ArticleService, ArticleStatus } from '@luhanxin/shared-types';
import { Skeleton } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const fetchedRef = useRef(false);

  const fetchArticles = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      setLoading(true);
      const res = await articleClient.listArticles({
        pagination: { pageSize: 20, pageToken: '' },
        authorId: authorId ?? '',
        query: query ?? '',
        tag: tag ?? '',
      });
      // 过滤掉归档文章（归档只在管理台显示）
      const visible = res.articles.filter((a) => a.status !== ArticleStatus.ARCHIVED);
      setArticles(visible);
      onLoad?.(res.pagination?.totalCount ?? visible.length);
    } catch (err) {
      console.error('ListArticles failed:', err);
    } finally {
      setLoading(false);
    }
  }, [authorId, query, tag, onLoad]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonItem}>
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
