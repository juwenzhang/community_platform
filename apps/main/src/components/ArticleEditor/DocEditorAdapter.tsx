/**
 * DocEditor 适配器
 *
 * 把 ArticleEditor 的 props 契约桥接到 @luhanxin/doc-editor 的 <DocEditor> 组件。
 * 三栏布局：左 TOC + 中编辑器 + （预留右栏）
 */

import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import {
  createCloudinaryUploadHandler,
  DocEditor,
  DocEditorProvider,
  EditorToc,
  type ProseMirrorJSON,
} from '@luhanxin/doc-editor';
import type { Editor } from '@tiptap/react';
import { Input, Select, Tag, Tooltip } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '@luhanxin/doc-editor/theme.css';
import styles from './articleEditor.module.less';
import type { UpdatedAtLike } from './index';

interface DocEditorAdapterProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialStatus?: number;
  initialCategories?: number[];
  initialUpdatedAt?: UpdatedAtLike | string;
  articleId?: string | null;
  onSave: (data: {
    title: string;
    content: string;
    tags: string[];
    status: number;
    categories: number[];
  }) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

/** 分类选项（与 proto ArticleCategory 枚举对齐，不含 UNSPECIFIED） */
const CATEGORY_OPTIONS = [
  { value: 1, label: '后端' },
  { value: 2, label: '前端' },
  { value: 3, label: 'AI' },
  { value: 4, label: '移动端' },
  { value: 5, label: '开发工具' },
  { value: 6, label: '阅读' },
];

export default function DocEditorAdapter({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialStatus = 1,
  initialCategories = [],
  initialUpdatedAt,
  articleId,
  onSave,
  onCancel,
  saving = false,
}: DocEditorAdapterProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [categories, setCategories] = useState<number[]>(initialCategories);
  const [tocVisible, setTocVisible] = useState(true);
  // editor 实例通过 onCreate 暴露，供 EditorToc 消费
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  // 滚动容器引用 — 传给 EditorToc 让它能算出精确偏移
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 上传 handler — 复用平台 Cloudinary 签名接口
  const uploadHandler = useMemo(
    () =>
      createCloudinaryUploadHandler({
        getAuthToken: () => localStorage.getItem('luhanxin_auth_token'),
        defaultFolder: articleId ? `article-images/${articleId}` : 'article-images',
      }),
    [articleId],
  );

  // 服务端 updatedAt → 毫秒时间戳
  const serverUpdatedAt = useMemo<number | null>(() => {
    if (!initialUpdatedAt) return null;
    if (typeof initialUpdatedAt === 'string') {
      const ts = new Date(initialUpdatedAt).getTime();
      return Number.isNaN(ts) ? null : ts;
    }
    const { seconds, nanos } = initialUpdatedAt;
    return Number(seconds) * 1000 + Math.floor(nanos / 1_000_000);
  }, [initialUpdatedAt]);

  const handleChange = useCallback((markdown: string, _json: ProseMirrorJSON) => {
    setContent(markdown);
  }, []);

  const handleRemoteSave = useCallback(
    async (markdown: string) => {
      if (title.trim()) {
        await onSave({ title, content: markdown, tags, status, categories });
      }
    },
    [title, tags, status, categories, onSave],
  );

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    await onSave({ title, content, tags, status, categories });
  };

  return createPortal(
    <div className={styles.editor}>
      {/* 顶部栏 */}
      <div className={styles.toolbar}>
        <Tooltip title={tocVisible ? '隐藏大纲' : '显示大纲'}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setTocVisible((v) => !v)}
            aria-label="切换大纲"
          >
            <MenuOutlined />
          </button>
        </Tooltip>
        <Input
          className={styles.titleInput}
          placeholder="输入文章标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="large"
          variant="borderless"
        />
        <div className={styles.toolbarRight}>
          <Select
            mode="multiple"
            value={categories}
            onChange={setCategories}
            options={CATEGORY_OPTIONS}
            size="small"
            style={{ minWidth: 140 }}
            placeholder="选择分类"
            maxTagCount={2}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: 1, label: '草稿' },
              { value: 2, label: '发布' },
            ]}
            size="small"
            style={{ width: 80 }}
          />
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !content.trim()}
          >
            {saving ? '保存中...' : status === 2 ? '发布' : '保存草稿'}
          </button>
          {onCancel && (
            <button type="button" className={styles.closeBtn} onClick={onCancel}>
              <CloseOutlined />
            </button>
          )}
        </div>
      </div>

      {/* 标签输入 */}
      <div className={styles.tagsBar}>
        {tags.map((tag) => (
          <Tag key={tag} closable onClose={() => handleRemoveTag(tag)}>
            {tag}
          </Tag>
        ))}
        <Input
          className={styles.tagInput}
          placeholder="添加标签 (回车确认)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onPressEnter={handleAddTag}
          size="small"
          style={{ width: 120 }}
          variant="borderless"
        />
      </div>

      {/* 主体：三栏布局 */}
      <div className={styles.mainLayout}>
        {/* 左侧 TOC */}
        {tocVisible && (
          <aside className={styles.tocSidebar}>
            <EditorToc
              editor={editorInstance}
              scrollContainer={() => scrollContainerRef.current}
              scrollOffset={24}
            />
          </aside>
        )}

        {/* 中间编辑器 */}
        <div className={styles.docEditorWrapper} ref={scrollContainerRef}>
          <DocEditorProvider value={{ uploadHandler }}>
            <DocEditor
              initialContent={initialContent}
              placeholder="开始书写，输入 / 快速插入块..."
              articleId={articleId ?? null}
              serverUpdatedAt={serverUpdatedAt}
              onChange={handleChange}
              onSave={handleRemoteSave}
              uploadHandler={uploadHandler}
              autosaveIntervalMs={30_000}
              className={styles.docEditor}
              onEditorReady={setEditorInstance}
            />
          </DocEditorProvider>
        </div>
      </div>
    </div>,
    document.body,
  );
}
