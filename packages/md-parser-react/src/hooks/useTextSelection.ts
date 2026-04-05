import { useEffect, useState } from 'react';

export interface TextSelectionResult {
  text: string;
  /** 选区是否在 markdown 容器内 */
  isInContainer: boolean;
}

/**
 * 只读选区感知 Hook
 *
 * 监听 selectionchange 事件，返回选中文本内容。
 * 用于「引用回复」「划线评论」等场景。
 */
export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>,
): TextSelectionResult {
  const [selection, setSelection] = useState<TextSelectionResult>({
    text: '',
    isInContainer: false,
  });

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection({ text: '', isInContainer: false });
        return;
      }

      const text = sel.toString().trim();
      const container = containerRef.current;
      const isInContainer = !!(container && sel.anchorNode && container.contains(sel.anchorNode));

      setSelection({ text, isInContainer });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [containerRef]);

  return selection;
}
