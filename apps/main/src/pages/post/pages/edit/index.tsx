import { Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArticleEditor from '@/components/ArticleEditor';
import { antdMessage } from '@/lib/antdStatic';
import { useArticleStore } from '@/stores/useArticleStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentArticle: article,
    detailLoading: loading,
    fetchArticle,
    updateArticle,
    clearCurrentArticle,
  } = useArticleStore();

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchArticle(id);
    return () => clearCurrentArticle();
  }, [id, fetchArticle, clearCurrentArticle]);

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
    categories: number[];
  }) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateArticle(id, {
        title: data.title,
        content: data.content,
        tags: data.tags,
        status: data.status,
        categories: data.categories,
      });
      antdMessage.success('文章更新成功');
      navigate(`/post/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失败';
      antdMessage.error(msg);
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
      initialCategories={article.categories}
      onSave={handleSave}
      onCancel={() => navigate(`/post/${id}`)}
      saving={saving}
    />
  );
}
