/**
 * 块级操作手柄
 *
 * 轻量实现（非 ProseMirror Decoration 版本）：
 * - 监听 editor DOM 的 mousemove，找到 hover 的顶级块元素
 * - 在块元素左侧绝对定位显示 `⋮⋮` 手柄
 * - 点击手柄打开菜单：删除 / 复制 / 上移 / 下移
 *
 * 拖拽排序：受限于实现复杂度，本 Phase 不做；用户可通过菜单的"上移/下移"替代。
 * 完整拖拽在未来的 editor-drag-sort change 中实现。
 */

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface BlockHandleProps {
  editor: Editor;
  /** 手柄与块的水平偏移（像素），默认 -28 */
  offsetX?: number;
}

interface HandlePosition {
  top: number;
  left: number;
  pos: number;
}

/**
 * 找到当前 hover 的顶级块元素及其 PM 位置
 */
function findHoveredBlock(
  editor: Editor,
  clientX: number,
  clientY: number,
): { element: HTMLElement; pos: number } | null {
  const view = editor.view;
  const posInfo = view.posAtCoords({ left: clientX, top: clientY });
  if (!posInfo) return null;

  // 找到 top-level block node 的位置
  const $pos = view.state.doc.resolve(posInfo.pos);
  if ($pos.depth === 0) return null;
  const topLevelPos = $pos.before(1);

  // 对应的 DOM 节点
  const dom = view.nodeDOM(topLevelPos);
  if (!(dom instanceof HTMLElement)) return null;

  return { element: dom, pos: topLevelPos };
}

export function BlockHandle({ editor, offsetX = -28 }: BlockHandleProps) {
  const [handle, setHandle] = useState<HandlePosition | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateHandle = useCallback(
    (event: MouseEvent) => {
      if (menuOpen) return; // 菜单打开时不跟随鼠标
      const result = findHoveredBlock(editor, event.clientX, event.clientY);
      if (!result) {
        setHandle(null);
        return;
      }
      const rect = result.element.getBoundingClientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      setHandle({
        top: rect.top - editorRect.top,
        left: rect.left - editorRect.left + offsetX,
        pos: result.pos,
      });
    },
    [editor, menuOpen, offsetX],
  );

  useEffect(() => {
    const dom = editor.view.dom;
    const handleLeave = () => {
      if (!menuOpen) setHandle(null);
    };
    dom.addEventListener('mousemove', updateHandle);
    dom.addEventListener('mouseleave', handleLeave);
    return () => {
      dom.removeEventListener('mousemove', updateHandle);
      dom.removeEventListener('mouseleave', handleLeave);
    };
  }, [editor, menuOpen, updateHandle]);

  // 点击菜单外关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  if (!handle) return null;

  const executeAction = (action: 'delete' | 'duplicate' | 'move-up' | 'move-down') => {
    const { pos } = handle;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    const from = pos;
    const to = pos + node.nodeSize;

    if (action === 'delete') {
      editor.chain().focus().deleteRange({ from, to }).run();
    } else if (action === 'duplicate') {
      editor.chain().focus().insertContentAt(to, node.toJSON()).run();
    } else if (action === 'move-up') {
      // 找到前一个同级块，交换位置
      const $from = editor.state.doc.resolve(pos);
      if ($from.index(0) === 0) return; // 已经是第一个
      const prev = editor.state.doc.child($from.index(0) - 1);
      const prevPos = pos - prev.nodeSize;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(prevPos, node.toJSON())
        .run();
    } else if (action === 'move-down') {
      const $from = editor.state.doc.resolve(pos);
      if ($from.index(0) === editor.state.doc.childCount - 1) return;
      const next = editor.state.doc.child($from.index(0) + 1);
      const nextPos = to + next.nodeSize;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(nextPos - node.nodeSize, node.toJSON())
        .run();
    }

    setMenuOpen(false);
    setHandle(null);
  };

  return (
    <div
      className="doc-editor-block-handle"
      style={{
        position: 'absolute',
        top: handle.top,
        left: handle.left,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        className="doc-editor-block-handle__button"
        title="块操作"
        aria-label="块操作"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ⋮⋮
      </button>
      {menuOpen && (
        <div ref={menuRef} className="doc-editor-block-handle__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => executeAction('move-up')}>
            上移
          </button>
          <button type="button" role="menuitem" onClick={() => executeAction('move-down')}>
            下移
          </button>
          <button type="button" role="menuitem" onClick={() => executeAction('duplicate')}>
            复制块
          </button>
          <button
            type="button"
            role="menuitem"
            className="doc-editor-block-handle__menu-danger"
            onClick={() => executeAction('delete')}
          >
            删除块
          </button>
        </div>
      )}
    </div>
  );
}
