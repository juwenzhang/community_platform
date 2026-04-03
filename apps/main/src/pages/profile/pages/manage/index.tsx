import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { ArticleStatus } from '@luhanxin/shared-types';
import { Button, message, Popconfirm } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArticleEditor from '@/components/ArticleEditor';
import { useArticleStore } from '@/stores/useArticleStore';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from './manage.module.less';

type FilterTab = 'all' | 'draft' | 'published' | 'archived';

export default function ArticleManagePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    articles,
    listLoading: loading,
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
  } = useArticleStore();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMyArticles = useCallback(() => {
    if (user) fetchArticles({ authorId: user.id });
  }, [user, fetchArticles]);

  useEffect(() => {
    loadMyArticles();
  }, [loadMyArticles]);

  if (!isAuthenticated || !user) {
    return <div className={styles.empty}>请先登录后再管理文章</div>;
  }

  // 从 store 的 articles 找到正在编辑的文章
  const editingArticle = editingArticleId
    ? (articles.find((a) => a.id === editingArticleId) ?? null)
    : null;

  // 筛选
  const filteredArticles = articles.filter((a) => {
    if (filter === 'draft') return a.status === ArticleStatus.DRAFT;
    if (filter === 'published') return a.status === ArticleStatus.PUBLISHED;
    if (filter === 'archived') return a.status === ArticleStatus.ARCHIVED;
    return a.status !== ArticleStatus.ARCHIVED;
  });

  const draftCount = articles.filter((a) => a.status === ArticleStatus.DRAFT).length;
  const publishedCount = articles.filter((a) => a.status === ArticleStatus.PUBLISHED).length;
  const archivedCount = articles.filter((a) => a.status === ArticleStatus.ARCHIVED).length;

  // 新建文章
  const handleNew = () => {
    setEditingArticleId(null);
    setEditorOpen(true);
  };

  // 编辑文章
  const handleEdit = (articleId: string) => {
    setEditingArticleId(articleId);
    setEditorOpen(true);
  };

  // 保存（新建或更新）
  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    status: number;
    categories: number[];
  }) => {
    setSaving(true);
    try {
      if (editingArticleId) {
        await updateArticle(editingArticleId, {
          title: data.title,
          content: data.content,
          tags: data.tags,
          status: data.status,
          categories: data.categories,
        });
        message.success('文章更新成功');
      } else {
        await createArticle({
          title: data.title,
          content: data.content,
          tags: data.tags,
          status: data.status,
          categories: data.categories,
        });
        message.success(data.status === 2 ? '文章发布成功' : '草稿保存成功');
      }
      setEditorOpen(false);
      setEditingArticleId(null);
      loadMyArticles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // 快捷发布（草稿 → 已发布）
  const handlePublish = async (articleId: string) => {
    try {
      await updateArticle(articleId, { status: ArticleStatus.PUBLISHED });
      message.success('发布成功');
      loadMyArticles();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '发布失败');
    }
  };

  // 撤回（已发布 → 草稿）
  const handleUnpublish = async (articleId: string) => {
    try {
      await updateArticle(articleId, { status: ArticleStatus.DRAFT });
      message.success('已撤回为草稿');
      loadMyArticles();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '撤回失败');
    }
  };

  // 删除
  const handleDelete = async (articleId: string) => {
    try {
      await deleteArticle(articleId);
      message.success('已删除');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const formatDate = (ts: { seconds: bigint } | undefined) => {
    if (!ts) return '-';
    return new Date(Number(ts.seconds) * 1000).toLocaleDateString('zh-CN');
  };

  return (
    <>
      <div className={styles.manage}>
        {/* 顶部 */}
        <div className={styles.header}>
          <h2 className={styles.title}>文章管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
            新建文章
          </Button>
        </div>

        {/* Tab 筛选 */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 ({articles.filter((a) => a.status !== ArticleStatus.ARCHIVED).length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'draft' ? styles.active : ''}`}
            onClick={() => setFilter('draft')}
          >
            草稿 ({draftCount})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'published' ? styles.active : ''}`}
            onClick={() => setFilter('published')}
          >
            已发布 ({publishedCount})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${filter === 'archived' ? styles.active : ''}`}
            onClick={() => setFilter('archived')}
          >
            归档 ({archivedCount})
          </button>
        </div>

        {/* 文章列表 */}
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : filteredArticles.length === 0 ? (
          <div className={styles.empty}>
            {filter === 'draft'
              ? '没有草稿'
              : filter === 'published'
                ? '没有已发布文章'
                : filter === 'archived'
                  ? '没有归档文章'
                  : '还没有文章，开始写第一篇吧'}
          </div>
        ) : (
          <div className={styles.list}>
            {filteredArticles.map((article) => {
              const isDraft = article.status === ArticleStatus.DRAFT;
              const isPublished = article.status === ArticleStatus.PUBLISHED;
              const isArchived = article.status === ArticleStatus.ARCHIVED;

              return (
                <div key={article.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTitleRow}>
                      <h3 className={styles.itemTitle}>
                        <a
                          href={`/post/${article.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/post/${article.id}`);
                          }}
                        >
                          {article.title}
                        </a>
                      </h3>
                      {isDraft && <span className={styles.draftBadge}>草稿</span>}
                      {isPublished && <span className={styles.publishedBadge}>已发布</span>}
                      {isArchived && <span className={styles.archivedBadge}>已归档</span>}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>{formatDate(article.updatedAt)}</span>
                      {article.viewCount > 0 && (
                        <span>
                          <EyeOutlined /> {article.viewCount}
                        </span>
                      )}
                      {article.tags.length > 0 && (
                        <span className={styles.itemTags}>
                          {article.tags.map((t) => (
                            <span key={t} className={styles.itemTag}>
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    {isArchived ? (
                      <>
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          onClick={() => handleUnpublish(article.id)}
                        >
                          恢复为草稿
                        </Button>
                        <Popconfirm
                          title="永久删除这篇文章？"
                          description="此操作不可恢复！"
                          onConfirm={() => handleDelete(article.id)}
                          okText="永久删除"
                          okButtonProps={{ danger: true }}
                          cancelText="取消"
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            永久删除
                          </Button>
                        </Popconfirm>
                      </>
                    ) : (
                      <>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(article.id)}
                        >
                          编辑
                        </Button>
                        {isDraft && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => handlePublish(article.id)}
                          >
                            发布
                          </Button>
                        )}
                        {isPublished && (
                          <Button
                            size="small"
                            icon={<UndoOutlined />}
                            onClick={() => handleUnpublish(article.id)}
                          >
                            撤回
                          </Button>
                        )}
                        <Popconfirm
                          title="确定删除这篇文章？"
                          description="删除后可在归档 Tab 中找回"
                          onConfirm={() => handleDelete(article.id)}
                          okText="删除"
                          cancelText="取消"
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 全屏编辑器（Portal） */}
      {editorOpen && (
        <ArticleEditor
          initialTitle={editingArticle?.title}
          initialContent={editingArticle?.content}
          initialTags={editingArticle?.tags}
          initialStatus={editingArticle?.status}
          initialCategories={editingArticle?.categories}
          onSave={handleSave}
          onCancel={() => {
            setEditorOpen(false);
            setEditingArticleId(null);
          }}
          saving={saving}
        />
      )}
    </>
  );
}
