import {
  ClockCircleOutlined,
  CommentOutlined,
  EyeOutlined,
  HeartOutlined,
  ShareAltOutlined,
  StarOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { Article } from '@luhanxin/shared-types';
import { ArticleStatus } from '@luhanxin/shared-types';
import { Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';

import { antdMessage } from '@/lib/antdStatic';
import styles from './articleCard.module.less';

/** 去除 Markdown 标记，返回纯文本（用于摘要预览） */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]+`/g, '') // 行内代码
    .replace(/#{1,6}\s+/g, '') // 标题
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // 加粗/斜体
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 图片
    .replace(/>\s+/g, '') // 引用
    .replace(/<[^>]+>/g, '') // HTML 标签
    .replace(/[-*+]\s+/g, '') // 无序列表
    .replace(/\d+\.\s+/g, '') // 有序列表
    .replace(/\n{2,}/g, ' ') // 多空行 → 空格
    .replace(/\n/g, ' ') // 单换行 → 空格
    .trim();
}

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
    <div
      className={styles.card}
      onClick={() => navigate(`/post/${article.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/post/${article.id}`)}
    >
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{article.title}</h3>
          {isDraft && <span className={styles.draftBadge}>草稿</span>}
          {isArchived && <span className={styles.archivedBadge}>已归档</span>}
        </div>
        {article.summary && <p className={styles.summary}>{stripMarkdown(article.summary)}</p>}

        <div className={styles.meta}>
          {author && (
            <span className={styles.author}>
              <Avatar
                src={author.avatarUrl || undefined}
                icon={!author.avatarUrl ? <UserOutlined /> : undefined}
                size={18}
              />
              <span
                className={styles.authorName}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/${author.username}`);
                }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    navigate(`/user/${author.username}`);
                  }
                }}
              >
                {author.displayName || author.username}
              </span>
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

          {article.likeCount > 0 && (
            <span className={styles.likes}>
              <HeartOutlined />
              {article.likeCount}
            </span>
          )}

          {article.commentCount > 0 && (
            <span className={styles.comments}>
              <CommentOutlined />
              {article.commentCount}
            </span>
          )}

          {article.favoriteCount > 0 && (
            <span className={styles.favorites}>
              <StarOutlined />
              {article.favoriteCount}
            </span>
          )}

          <span
            className={styles.share}
            onClick={(e) => {
              e.stopPropagation();
              const url = `${window.location.origin}/post/${article.id}`;
              if (navigator.share) {
                navigator.share({ title: article.title, url });
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  antdMessage.success('链接已复制到剪贴板');
                });
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                const url = `${window.location.origin}/post/${article.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  antdMessage.success('链接已复制到剪贴板');
                });
              }
            }}
          >
            <ShareAltOutlined />
          </span>
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
    </div>
  );
}
