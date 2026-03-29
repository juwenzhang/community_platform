import { useEffect, useMemo, useState } from 'react';

import styles from './articleToc.module.less';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleTocProps {
  /** Markdown 原始内容，用于提取标题 */
  content: string;
}

/** 从 Markdown 内容中提取标题，生成 TOC 数据 */
function extractHeadings(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const items: TocItem[] = [];

  for (const match of markdown.matchAll(headingRegex)) {
    const level = match[1].length;
    const text = match[2].trim();
    // id 生成规则需和 rehype-slug 一致：小写 + 连字符 + 去特殊字符
    const id = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    items.push({ id, text, level });
  }

  return items;
}

/** 文章目录导航（TOC）— 自动从 Markdown 标题生成锚点 */
export default function ArticleToc({ content }: ArticleTocProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState('');

  // 监听滚动，高亮当前可见的标题
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className={styles.toc}>
      <h4 className={styles.tocTitle}>目录</h4>
      <nav className={styles.tocNav}>
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`${styles.tocItem} ${activeId === heading.id ? styles.active : ''}`}
            style={{ paddingLeft: `${(heading.level - minLevel) * 12 + 8}px` }}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(heading.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(heading.id);
                // 更新 URL hash
                window.history.replaceState(null, '', `#${heading.id}`);
              }
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
