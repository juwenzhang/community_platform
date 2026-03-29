import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { createClient } from '@connectrpc/connect';
import type { Article } from '@luhanxin/shared-types';
import { ArticleService } from '@luhanxin/shared-types';
import { Avatar, Button, Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import ArticleToc from '@/components/ArticleToc';
import { transport } from '@/lib/connect';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from './detail.module.less';

const articleClient = createClient(ArticleService, transport);

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    articleClient
      .getArticle({ articleId: id })
      .then((res) => {
        if (res.article) setArticle(res.article);
        else setError('文章不存在');
      })
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

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
          <Markdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeSlug, rehypeHighlight]}
          >
            {article.content}
          </Markdown>
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
