import { createClient } from '@connectrpc/connect';
import type { Article } from '@luhanxin/shared-types';
import { ArticleService } from '@luhanxin/shared-types';
import { message, Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { transport } from '@/lib/connect';
import { useAuthStore } from '@/stores/useAuthStore';
import ArticleEditor from '../../components/ArticleEditor';

const articleClient = createClient(ArticleService, transport);

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    articleClient
      .getArticle({ articleId: id })
      .then((res) => {
        if (res.article) setArticle(res.article);
      })
      .catch((err) => {
        message.error(err.message || '加载文章失败');
        navigate('/article/create');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
        请先登录
      </div>
    );
  }

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (!article) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
        文章不存在
      </div>
    );
  }

  if (user?.id !== article.authorId) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
        只有作者可以编辑此文章
      </div>
    );
  }

  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    status: number;
  }) => {
    if (!id) return;
    setSaving(true);
    try {
      await articleClient.updateArticle({
        articleId: id,
        title: data.title,
        content: data.content,
        summary: '',
        tags: data.tags,
        status: data.status,
      });
      message.success('文章更新成功');
      navigate(`/article/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArticleEditor
      initialTitle={article.title}
      initialContent={article.content}
      initialTags={article.tags}
      initialStatus={article.status}
      onSave={handleSave}
      onCancel={() => navigate('/article/create')}
      saving={saving}
    />
  );
}
