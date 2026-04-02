import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Skeleton } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArticleToc from '@/components/ArticleToc';
import MarkdownRender from '@/components/MarkdownRender';
import { useArticleStore } from '@/stores/useArticleStore';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from './detail.module.less';

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentArticle: article,
    detailLoading: loading,
    detailError: error,
    fetchArticle,
    clearCurrentArticle,
  } = useArticleStore();

  const fetchLock = useRef(false);

  useEffect(() => {
    if (id) fetchArticle(id);
    if (fetchLock.current) return;
    fetchLock.current = true;
    return () => {
      clearCurrentArticle();
      fetchLock.current = false;
    };
  }, [id, fetchArticle, clearCurrentArticle]);

  if (loading) {
    return (
      <div className={styles.detailLayout}>
        <div className={styles.detail}>
          <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 10 }} />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.detailLayout}>
        <div className={styles.detail}>
          <div className={styles.error}>
            <p>{error || '文章不存在'}</p>
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </div>
        </div>
      </div>
    );
  }

  const author = article.author;
  const isAuthor = user?.id === article.authorId;
  const publishedAt = article.publishedAt
    ? new Date(Number(article.publishedAt.seconds) * 1000).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className={styles.detailLayout}>
      {/* 文章正文 */}
      <div className={styles.detail}>
        <div className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>

          <div className={styles.meta}>
            {author && (
              <span className={styles.author}>
                <Avatar
                  src={author.avatarUrl || undefined}
                  icon={!author.avatarUrl ? <UserOutlined /> : undefined}
                  size={24}
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
            <span className={styles.views}>
              <EyeOutlined />
              {article.viewCount} 阅读
            </span>
          </div>

          {article.tags.length > 0 && (
            <div className={styles.tags}>
              <TagOutlined />
              {article.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.content}>
          <MarkdownRender content={article.content} />
        </div>

        <div className={styles.actions}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
          {isAuthor && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/post/${article.id}/edit`)}
            >
              编辑文章
            </Button>
          )}
        </div>
      </div>

      {/* 右侧目录导航 */}
      <div className={styles.tocSidebar}>
        <ArticleToc content={article.content} />
      </div>
    </div>
  );
}
