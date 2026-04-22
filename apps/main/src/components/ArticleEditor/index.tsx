/**
 * ArticleEditor — 文章编辑器门面组件
 *
 * 支持两种实现的灰度切换：
 * - 新版（默认）：基于 @luhanxin/doc-editor 的块编辑器（WYSIWYG）
 * - Legacy：传统 Markdown textarea + 预览分栏（`index.legacy.tsx`）
 *
 * 灰度方式：环境变量 `VITE_USE_DOC_EDITOR`
 * - 未设置 / '1' / 'true'：使用新编辑器（默认）
 * - '0' / 'false'：使用 legacy 编辑器
 *
 * Props 契约保持向后兼容，所有调用方（edit 页、manage 页）无需修改。
 */

import DocEditorAdapter from './DocEditorAdapter';
import LegacyArticleEditor from './index.legacy';

/** protobuf-es Timestamp 的最小形态，避免 ArticleEditor 直接依赖 shared-types */
export interface UpdatedAtLike {
  seconds: bigint;
  nanos: number;
}

export interface ArticleEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialStatus?: number;
  initialCategories?: number[];
  /** 服务端 updated_at，用于乐观锁 + 草稿恢复对比；接收 protobuf-es Timestamp 或 RFC3339 字符串 */
  initialUpdatedAt?: UpdatedAtLike | string;
  /** 编辑现有文章时传入，新建时为 null/undefined */
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

/**
 * 读取灰度开关
 *
 * `VITE_USE_DOC_EDITOR` 默认启用新编辑器；设为 '0' 或 'false' 回退 legacy。
 */
function useNewEditor(): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Vite 环境变量 import.meta.env
  const env = (import.meta as any).env;
  const flag = env?.VITE_USE_DOC_EDITOR;
  if (flag === '0' || flag === 'false') return false;
  return true;
}

export default function ArticleEditor(props: ArticleEditorProps) {
  if (useNewEditor()) {
    return <DocEditorAdapter {...props} />;
  }
  return <LegacyArticleEditor {...props} />;
}
