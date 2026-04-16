/**
 * 渲染引擎 — 复杂度检测与自动阈值选择
 *
 * 根据文档复杂度指标计算分数，自动选择最优渲染策略。
 */

import type { DocumentComplexity, RenderEngineOptions, RenderLevel } from '../types/engine';
import type { ParseResult } from '../types/result';

/** 默认阈值 */
const DEFAULT_THRESHOLDS = {
  virtualList: 50,
  canvas: 500,
  webgl: 2000,
};

/**
 * 从 ParseResult 计算文档复杂度
 */
export function computeComplexity(result: ParseResult): DocumentComplexity {
  const blocks = result.blocks;

  return {
    charCount: result.plainText.length,
    blockCount: blocks.length,
    codeBlockCount: blocks.filter((b) => b.type === 'code').length,
    mermaidCount: 0, // Mermaid 在渲染后才确定，这里可从 html 中检测
    imageCount: (result.html.match(/<img /g) || []).length,
    tableCount: blocks.filter((b) => b.type === 'table').length,
  };
}

/**
 * 计算文档复杂度分数
 *
 * 分数越高，需要越高级的渲染策略。
 */
export function computeComplexityScore(complexity: DocumentComplexity): number {
  return (
    complexity.charCount / 1000 +
    complexity.blockCount * 2 +
    complexity.codeBlockCount * 10 +
    complexity.mermaidCount * 50 +
    complexity.imageCount * 10 +
    complexity.tableCount * 20
  );
}

/**
 * 根据复杂度分数自动选择渲染级别
 */
export function detectRenderLevel(result: ParseResult, options?: RenderEngineOptions): RenderLevel {
  // 强制指定
  if (options?.forceLevel) return options.forceLevel;

  const complexity = computeComplexity(result);
  const score = computeComplexityScore(complexity);
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...options?.thresholds,
  };

  if (score < thresholds.virtualList) return 'dom';
  if (score < thresholds.canvas) return 'virtual-list';
  if (score < thresholds.webgl) return 'canvas';
  return 'webgl';
}

/**
 * 检测浏览器是否支持指定渲染级别
 */
export function isLevelSupported(level: RenderLevel): boolean {
  switch (level) {
    case 'dom':
    case 'virtual-list':
      return true;
    case 'canvas':
      if (typeof document === 'undefined') return false;
      try {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('2d');
      } catch {
        return false;
      }
    case 'webgl':
      if (typeof document === 'undefined') return false;
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
      } catch {
        return false;
      }
  }
}

/**
 * 降级到最近可用的渲染级别
 *
 * 降级顺序: webgl → canvas → virtual-list → dom
 */
export function fallbackLevel(level: RenderLevel): RenderLevel {
  const levels: RenderLevel[] = ['webgl', 'canvas', 'virtual-list', 'dom'];
  const currentIndex = levels.indexOf(level);

  for (let i = currentIndex; i < levels.length; i++) {
    if (isLevelSupported(levels[i])) {
      return levels[i];
    }
  }

  return 'dom'; // DOM 始终可用
}
