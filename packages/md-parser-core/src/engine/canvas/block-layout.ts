/**
 * Canvas 块级元素布局计算
 *
 * 将 BlockNode 列表按纵向排列，计算每个 block 的 y 偏移和高度。
 */
import type { BlockNode } from '../../types/result';

export interface BlockLayout {
  blockIndex: number;
  type: BlockNode['type'];
  y: number;
  height: number;
}

export interface DocumentLayout {
  blocks: BlockLayout[];
  totalHeight: number;
}

/** 各类型 block 的上下间距 */
const BLOCK_MARGINS: Record<string, { top: number; bottom: number }> = {
  heading: { top: 24, bottom: 12 },
  paragraph: { top: 8, bottom: 8 },
  code: { top: 16, bottom: 16 },
  table: { top: 16, bottom: 16 },
  container: { top: 16, bottom: 16 },
  list: { top: 8, bottom: 8 },
  blockquote: { top: 12, bottom: 12 },
  thematicBreak: { top: 24, bottom: 24 },
  html: { top: 8, bottom: 8 },
  math: { top: 16, bottom: 16 },
};

/**
 * 计算所有 block 的布局位置
 */
export function computeDocumentLayout(blocks: BlockNode[]): DocumentLayout {
  const layouts: BlockLayout[] = [];
  let currentY = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const margins = BLOCK_MARGINS[block.type] || { top: 8, bottom: 8 };

    currentY += margins.top;

    layouts.push({
      blockIndex: i,
      type: block.type,
      y: currentY,
      height: block.estimatedHeight,
    });

    currentY += block.estimatedHeight + margins.bottom;
  }

  return {
    blocks: layouts,
    totalHeight: currentY,
  };
}

/**
 * 获取可视区域内的 block 范围
 */
export function getVisibleBlocks(
  layout: DocumentLayout,
  scrollTop: number,
  viewportHeight: number,
  buffer = 200,
): { startIndex: number; endIndex: number } {
  const top = scrollTop - buffer;
  const bottom = scrollTop + viewportHeight + buffer;

  let startIndex = 0;
  let endIndex = layout.blocks.length - 1;

  // 二分查找起始位置
  for (let i = 0; i < layout.blocks.length; i++) {
    const block = layout.blocks[i];
    if (block.y + block.height >= top) {
      startIndex = i;
      break;
    }
  }

  // 二分查找结束位置
  for (let i = layout.blocks.length - 1; i >= 0; i--) {
    const block = layout.blocks[i];
    if (block.y <= bottom) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}
