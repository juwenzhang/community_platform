import { ClockCircleOutlined, EyeOutlined, TagOutlined, UserOutlined } from '@ant-design/icons';
import type { Article } from '@luhanxin/shared-types';
import { ArticleStatus } from '@luhanxin/shared-types';
import { Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './articleCard.module.less';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const navigate = useNavigate();

  const author = article.author;
  const isDraft = article.status === ArticleStatus.DRAFT;
  const isArchived = article.status === ArticleStatus.ARCHIVED;
  const publishedAt = article.publishedAt
    ? new Date(Number(article.publishedAt.seconds) * 1000).toLocaleDateString('zh-CN')
    : '';

  return (
    <button type="button" className={styles.card} onClick={() => navigate(`/post/${article.id}`)}>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{article.title}</h3>
          {isDraft && <span className={styles.draftBadge}>草稿</span>}
          {isArchived && <span className={styles.archivedBadge}>已归档</span>}
        </div>
        {article.summary && <p className={styles.summary}>{article.summary}</p>}

        <div className={styles.meta}>
          {author && (
            <span className={styles.author}>
              <Avatar
                src={author.avatarUrl || undefined}
                icon={!author.avatarUrl ? <UserOutlined /> : undefined}
                size={18}
              />
              <span className={styles.authorName}>{author.displayName || author.username}</span>
            </span>
          )}

          {publishedAt && (
            <span className={styles.date}>
              <ClockCircleOutlined />
              {publishedAt}
            </span>
          )}

          {article.viewCount > 0 && (
            <span className={styles.views}>
              <EyeOutlined />
              {article.viewCount}
            </span>
          )}
        </div>
      </div>

      {article.tags.length > 0 && (
        <div className={styles.tags}>
          <TagOutlined className={styles.tagIcon} />
          {article.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
