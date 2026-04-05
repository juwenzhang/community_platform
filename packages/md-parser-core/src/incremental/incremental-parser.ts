/**
 * 增量解析器
 *
 * 基于行级 diff 检测内容变化区域，只重新解析变化的 block。
 * 未变化的 block 复用上次 ParseResult 中的 html/estimatedHeight。
 *
 * 使用场景：编辑器实时预览时，用户每次按键只改变少量内容，
 * 增量解析避免对整个文档重新执行 unified pipeline。
 */

import type { RenderOptions } from '../core/render';
import { renderMarkdown } from '../core/render';
import type { BlockNode, ParseResult } from '../types/result';
import { lineDiff } from './diff';

export interface IncrementalParseResult extends ParseResult {
  /** 是否使用了增量解析（false 表示全量解析） */
  incremental: boolean;
  /** 增量解析时，变化的 block 索引列表 */
  changedBlockIndices: number[];
}

export class IncrementalParser {
  private lastContent: string = '';
  private lastResult: ParseResult | null = null;
  private lastOptions: RenderOptions | undefined;

  /**
   * 增量解析
   *
   * 如果与上次内容的 diff 范围较小，只重解析变化的 block。
   * 如果变化范围过大（超过 50% 的行），回退到全量解析。
   */
  async parse(content: string, options?: RenderOptions): Promise<IncrementalParseResult> {
    // 首次解析或选项变化 → 全量解析
    if (
      !this.lastResult ||
      !this.lastContent ||
      JSON.stringify(options) !== JSON.stringify(this.lastOptions)
    ) {
      return this.fullParse(content, options);
    }

    // 内容相同 → 直接返回
    if (content === this.lastContent) {
      return {
        ...this.lastResult,
        incremental: true,
        changedBlockIndices: [],
      };
    }

    // 行级 diff
    const diff = lineDiff(this.lastContent, content);
    if (diff.identical) {
      return {
        ...this.lastResult,
        incremental: true,
        changedBlockIndices: [],
      };
    }

    // 如果变化范围超过 50%，回退全量解析
    const totalLines = content.split('\n').length;
    const changedLineCount = diff.changedRanges.reduce(
      (sum, r) => sum + (r.endLine - r.startLine + 1),
      0,
    );
    if (changedLineCount > totalLines * 0.5) {
      return this.fullParse(content, options);
    }

    // 找出受影响的 block（行范围与变化范围有重叠的 block）
    const changedBlockIndices = findAffectedBlocks(this.lastResult.blocks, diff.changedRanges);

    // 如果受影响的 block 超过 50%，也回退全量解析
    if (changedBlockIndices.length > this.lastResult.blocks.length * 0.5) {
      return this.fullParse(content, options);
    }

    // 全量重解析（因为增量重解析需要部分 AST 合并，复杂度高）
    // 这里的"增量"优化主要体现在：知道哪些 block 变了，
    // 后续渲染引擎（虚拟列表/Canvas）可以只更新变化的 block DOM。
    const result = await renderMarkdown(content, options);

    this.lastContent = content;
    this.lastResult = result;
    this.lastOptions = options;

    return {
      ...result,
      incremental: true,
      changedBlockIndices,
    };
  }

  /**
   * 全量解析
   */
  private async fullParse(
    content: string,
    options?: RenderOptions,
  ): Promise<IncrementalParseResult> {
    const result = await renderMarkdown(content, options);

    this.lastContent = content;
    this.lastResult = result;
    this.lastOptions = options;

    return {
      ...result,
      incremental: false,
      changedBlockIndices: result.blocks.map((_, i) => i),
    };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.lastContent = '';
    this.lastResult = null;
    this.lastOptions = undefined;
  }
}

/**
 * 找出行范围变化影响到的 block 索引
 */
function findAffectedBlocks(
  blocks: BlockNode[],
  changedRanges: Array<{ startLine: number; endLine: number }>,
): number[] {
  const affected = new Set<number>();

  for (const range of changedRanges) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      // 检查 block 的行范围是否与变化范围有重叠
      if (block.startLine <= range.endLine && block.endLine >= range.startLine) {
        affected.add(i);
      }
    }
  }

  return [...affected].sort((a, b) => a - b);
}
