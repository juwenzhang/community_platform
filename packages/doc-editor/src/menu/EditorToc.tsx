/**
 * EditorToc — 文档大纲侧边栏
 *
 * 订阅编辑器更新，自动抽取 H1-H3 生成目录，点击滚动定位到对应块。
 * 使用 IntersectionObserver 实时高亮当前视窗内的标题。
 *
 * 使用方式：
 *   <EditorToc editor={editor} />
 *   <EditorToc editor={editor} scrollContainer={() => wrapperRef.current} />
 *
 * 样式：通过 className hook 暴露给消费方（默认样式由消费方的 CSS 提供）。
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TocItem {
  level: number; // 1-3
  text: string;
  id: string; // 基于位置生成，用于 key + 滚动锚点
  pos: number; // ProseMirror 位置
}

export interface EditorTocProps {
  editor: Editor | null;
  /** 最大标题层级（默认 3，即 H1-H3） */
  maxLevel?: number;
  /** 点击 toc 项时是否平滑滚动，默认 true */
  smoothScroll?: boolean;
  /** 为空时的占位文案 */
  emptyText?: string;
  /** 标题文案（默认"大纲"） */
  title?: string;
  /** className hook */
  className?: string;
  /**
   * 自定义滚动容器（可滚动祖先）。
   * 如果不传则自动向上查找 editor.view.dom 的可滚动祖先。
   * 对三栏布局这类场景非常重要 —— 否则 scrollIntoView 找错容器。
   */
  scrollContainer?: () => HTMLElement | null;
  /** 滚动偏移（顶部 sticky 元素高度），默认 16 */
  scrollOffset?: number;
}

/**
 * 从 editor 中提取 TOC
 */
function extractToc(editor: Editor, maxLevel: number): TocItem[] {
  const items: TocItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return undefined;
    const level = Number(node.attrs.level ?? 1);
    if (level > maxLevel) return undefined;
    const text = node.textContent.trim();
    if (!text) return undefined;
    items.push({
      level,
      text,
      id: `heading-${pos}`,
      pos,
    });
    return undefined;
  });
  return items;
}

/**
 * 向上查找第一个 overflow-y:auto|scroll 的祖先
 */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null;
  while (cur && cur !== document.body) {
    const style = window.getComputedStyle(cur);
    const oy = style.overflowY;
    if ((oy === 'auto' || oy === 'scroll') && cur.scrollHeight > cur.clientHeight) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * 通过 ProseMirror 位置拿到对应的 DOM 元素（heading 节点元素）
 */
function getHeadingElement(editor: Editor, pos: number): HTMLElement | null {
  try {
    // nodeDOM 比 domAtPos 更直接 —— 直接拿节点对应的 DOM 根元素
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) return dom;
    // 兜底：domAtPos
    const { node } = editor.view.domAtPos(pos + 1);
    if (node instanceof HTMLElement) return node;
    if (node instanceof Text && node.parentElement) return node.parentElement;
  } catch {
    return null;
  }
  return null;
}

export function EditorToc({
  editor,
  maxLevel = 3,
  smoothScroll = true,
  emptyText = '暂无大纲',
  title = '大纲',
  className,
  scrollContainer,
  scrollOffset = 16,
}: EditorTocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  // ── 订阅 editor update 重建 TOC ──
  useEffect(() => {
    if (!editor) return;
    const rebuild = () => setItems(extractToc(editor, maxLevel));
    rebuild();
    editor.on('update', rebuild);
    editor.on('create', rebuild);
    return () => {
      editor.off('update', rebuild);
      editor.off('create', rebuild);
    };
  }, [editor, maxLevel]);

  // ── 解析滚动容器 ──
  const getContainer = useCallback((): HTMLElement | null => {
    if (scrollContainer) {
      const el = scrollContainer();
      if (el) return el;
    }
    // 未指定 → 自动查找
    if (!editor) return null;
    return findScrollableAncestor(editor.view.dom as HTMLElement);
  }, [editor, scrollContainer]);

  // ── IntersectionObserver 高亮当前视窗内的标题 ──
  useEffect(() => {
    if (!editor || items.length === 0) return;

    const container = getContainer();

    // 收集所有 heading DOM
    const mapping = items
      .map((item) => {
        const el = getHeadingElement(editor, item.pos);
        return el ? { item, el } : null;
      })
      .filter((x): x is { item: TocItem; el: HTMLElement } => x !== null);

    if (mapping.length === 0) return;

    // 使用 IO 自动发现进入视窗的标题
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return; // 点击触发的滚动期间不更新
        // 找到 "最靠上且仍在容器视窗内" 的那个
        const visibleEntries = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visibleEntries.length > 0) {
          const first = visibleEntries[0].target as HTMLElement;
          const matched = mapping.find((m) => m.el === first);
          if (matched) setActiveId(matched.item.id);
        }
      },
      {
        root: container, // 关键：使用正确的滚动容器作为 root
        rootMargin: `-${scrollOffset}px 0px -60% 0px`,
        threshold: 0,
      },
    );

    mapping.forEach(({ el }) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [editor, items, getContainer, scrollOffset]);

  // ── 点击跳转 ──
  const handleClick = useCallback(
    (item: TocItem) => {
      if (!editor) return;
      const el = getHeadingElement(editor, item.pos);
      const container = getContainer();

      if (el && container) {
        // 计算相对于容器的偏移
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const currentScroll = container.scrollTop;
        const targetScroll = currentScroll + (elRect.top - containerRect.top) - scrollOffset;

        // 标记程序性滚动，避免 IO 覆盖高亮
        isProgrammaticScrollRef.current = true;
        setActiveId(item.id);

        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: smoothScroll ? 'smooth' : 'auto',
        });

        // 500ms 后允许 IO 继续工作（给 smooth scroll 留时间）
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
        return;
      }

      if (el) {
        // 没找到容器，退回用 scrollIntoView
        el.scrollIntoView({ behavior: smoothScroll ? 'smooth' : 'auto', block: 'start' });
        setActiveId(item.id);
        return;
      }

      // 最终兜底：用 ProseMirror 位置
      editor.chain().focus().setTextSelection(item.pos).run();
    },
    [editor, getContainer, scrollOffset, smoothScroll],
  );

  const rootClassName = useMemo(
    () => (className ? `doc-editor-toc ${className}` : 'doc-editor-toc'),
    [className],
  );

  return (
    <nav className={rootClassName} aria-label={title}>
      <div className="doc-editor-toc__title">{title}</div>
      {items.length === 0 ? (
        <div className="doc-editor-toc__empty">{emptyText}</div>
      ) : (
        <ul className="doc-editor-toc__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={
                'doc-editor-toc__item' +
                ` doc-editor-toc__item--level-${item.level}` +
                (item.id === activeId ? ' doc-editor-toc__item--active' : '')
              }
            >
              <button
                type="button"
                className="doc-editor-toc__link"
                onClick={() => handleClick(item)}
                title={item.text}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
