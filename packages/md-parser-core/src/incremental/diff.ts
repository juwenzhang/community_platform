/**
 * 行级 Diff 算法
 *
 * 简化的 Myers diff，用于增量解析：
 * 对比新旧 Markdown 内容，返回变化的行范围。
 */

export interface DiffResult {
  /** 变化的行号范围列表（从 0 开始） */
  changedRanges: Array<{ startLine: number; endLine: number }>;
  /** 是否完全相同（无变化） */
  identical: boolean;
}

/**
 * 计算两个文本的行级 diff
 *
 * 返回变化的行范围，用于增量解析器判断哪些 block 需要重新解析。
 */
export function lineDiff(oldText: string, newText: string): DiffResult {
  if (oldText === newText) {
    return { changedRanges: [], identical: true };
  }

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const changedLines = new Set<number>();

  // 从头部找到第一个不同的行
  let headSame = 0;
  while (
    headSame < oldLines.length &&
    headSame < newLines.length &&
    oldLines[headSame] === newLines[headSame]
  ) {
    headSame++;
  }

  // 从尾部找到第一个不同的行
  let tailSame = 0;
  while (
    tailSame < oldLines.length - headSame &&
    tailSame < newLines.length - headSame &&
    oldLines[oldLines.length - 1 - tailSame] === newLines[newLines.length - 1 - tailSame]
  ) {
    tailSame++;
  }

  // 中间部分全部标记为变化
  const changeStart = headSame;
  const changeEndNew = newLines.length - tailSame;

  for (let i = changeStart; i < changeEndNew; i++) {
    changedLines.add(i);
  }

  // 合并为连续范围
  const changedRanges = mergeRanges(changedLines, newLines.length);

  return {
    changedRanges,
    identical: changedRanges.length === 0,
  };
}

/**
 * 将离散行号集合合并为连续范围
 */
function mergeRanges(
  lines: Set<number>,
  _totalLines: number,
): Array<{ startLine: number; endLine: number }> {
  if (lines.size === 0) return [];

  const sorted = [...lines].sort((a, b) => a - b);
  const ranges: Array<{ startLine: number; endLine: number }> = [];

  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ startLine: start, endLine: end });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ startLine: start, endLine: end });

  return ranges;
}
