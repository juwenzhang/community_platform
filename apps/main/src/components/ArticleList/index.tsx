import { ArticleStatus } from '@luhanxin/shared-types';
import { Skeleton } from 'antd';
import { useEffect, useRef } from 'react';

import { useArticleStore } from '@/stores/useArticleStore';
import ArticleCard from '../ArticleCard';
import styles from './articleList.module.less';

interface ArticleListProps {
  authorId?: string;
  query?: string;
  tag?: string;
  categories?: number[];
  onLoad?: (totalCount: number) => void;
}

export default function ArticleList({
  authorId,
  query,
  tag,
  categories,
  onLoad,
}: ArticleListProps) {
  const { articles, listLoading, totalCount, fetchArticles } = useArticleStore();
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    fetchArticles({ tag, authorId, query, categories, pageSize: 20 });
  }, [authorId, query, tag, categories, fetchArticles]);

  useEffect(() => {
    if (!listLoading && totalCount > 0) {
      onLoadRef.current?.(totalCount);
    }
  }, [listLoading, totalCount]);

  if (listLoading) {
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
    <div className={styles.list}>
      {visible.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
