import { CloseOutlined } from '@ant-design/icons';
import { Input, Select, Tag } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MarkdownRender from '@/components/MarkdownRender';

import styles from './articleEditor.module.less';

interface ArticleEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialStatus?: number;
  initialCategories?: number[];
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

export default function ArticleEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialStatus = 1,
  initialCategories = [],
  onSave,
  onCancel,
  saving = false,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [categories, setCategories] = useState<number[]>(initialCategories);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 在 textarea 光标位置包裹文本 */
  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);
      const newText = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;
      setContent(newText);
      // 恢复光标
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + before.length, end + before.length);
      });
    },
    [content],
  );

  /** 在光标位置插入文本 */
  const insertAtCursor = useCallback(
    (text: string, selectFrom?: number, selectTo?: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = `${content.slice(0, start)}${text}${content.slice(end)}`;
      setContent(newText);
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + (selectFrom ?? text.length);
        ta.setSelectionRange(cursorPos, start + (selectTo ?? text.length));
      });
    },
    [content],
  );

  /** textarea 键盘快捷键 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const isCmd = e.metaKey || e.ctrlKey;

      // Enter → 自动续列表前缀（-, *, 1., - [ ], - [x]）
      if (e.key === 'Enter' && !isCmd && !e.shiftKey) {
        const start = ta.selectionStart;
        const beforeCursor = content.slice(0, start);
        const currentLine = beforeCursor.split('\n').pop() || '';

        // 匹配列表前缀
        const listMatch = currentLine.match(/^(\s*)([-*]|\d+\.)\s(\[[ x]\]\s)?/);
        if (listMatch) {
          const [fullMatch, indent, bullet, checkbox] = listMatch;
          const lineContent = currentLine.slice(fullMatch.length);

          // 如果当前列表项为空 → 取消列表（删除前缀，只留回车）
          if (!lineContent.trim()) {
            e.preventDefault();
            const lineStart = beforeCursor.lastIndexOf('\n') + 1;
            const newText = `${content.slice(0, lineStart)}\n${content.slice(start)}`;
            setContent(newText);
            requestAnimationFrame(() => {
              ta.focus();
              ta.setSelectionRange(lineStart + 1, lineStart + 1);
            });
            return;
          }

          e.preventDefault();
          // 有序列表自动递增序号
          let prefix = `${indent}${bullet} `;
          if (/^\d+\.$/.test(bullet)) {
            prefix = `${indent}${Number.parseInt(bullet, 10) + 1}. `;
          }
          if (checkbox) {
            prefix += '[ ] ';
          }
          insertAtCursor(`\n${prefix}`);
          return;
        }
      }

      // Tab → 插入 2 空格（或缩进列表）
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newText = `${content.slice(0, start)}  ${content.slice(end)}`;
        setContent(newText);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(start + 2, start + 2);
        });
        return;
      }

      // Ctrl/Cmd + B → **加粗**
      if (isCmd && e.key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**');
        return;
      }

      // Ctrl/Cmd + I → *斜体*
      if (isCmd && e.key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*');
        return;
      }

      // Ctrl/Cmd + Shift + X → ~~删除线~~
      if (isCmd && e.shiftKey && e.key === 'x') {
        e.preventDefault();
        wrapSelection('~~', '~~');
        return;
      }

      // Ctrl/Cmd + K → [链接](url)
      if (isCmd && e.key === 'k') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = content.slice(start, end);
        if (selected) {
          wrapSelection('[', '](url)');
        } else {
          const newText = `${content.slice(0, start)}[链接文字](url)${content.slice(end)}`;
          setContent(newText);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(start + 1, start + 5);
          });
        }
        return;
      }

      // Ctrl/Cmd + ` → `代码`
      if (isCmd && e.key === '`') {
        e.preventDefault();
        wrapSelection('`', '`');
      }
    },
    [content, wrapSelection, insertAtCursor],
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

  // 使用 Portal 渲染到 body，实现真正的全屏编辑器
  return createPortal(
    <div className={styles.editor}>
      {/* 顶部栏 */}
      <div className={styles.toolbar}>
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

      {/* 左右分栏：编辑 + 预览 */}
      <div className={styles.splitPane}>
        <div className={styles.editPane}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="使用 Markdown 编写文章内容...&#10;&#10;快捷键：&#10;  Tab → 缩进&#10;  Ctrl+B → 加粗&#10;  Ctrl+I → 斜体&#10;  Ctrl+K → 链接&#10;  Ctrl+` → 代码&#10;  Ctrl+Shift+X → 删除线&#10;  Enter → 自动续列表"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className={styles.previewPane}>
          <div className={styles.previewHeader}>预览</div>
          <div className={styles.previewContent}>
            {content ? (
              <MarkdownRender content={content} />
            ) : (
              <p className={styles.previewPlaceholder}>Markdown 预览区域</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
