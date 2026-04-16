/**
 * Canvas 文本布局引擎
 *
 * 基于 Canvas 2D API 的 measureText 计算文本换行点，
 * 支持 bold/italic/code 等内联样式。
 * 布局结果缓存以避免重复计算。
 */
import { LRUCache } from '../../cache/lru-cache';

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  isCode?: boolean;
}

export interface LayoutLine {
  /** 行内的文本片段 */
  segments: Array<{
    text: string;
    style: TextStyle;
    x: number;
    width: number;
  }>;
  /** 行的 y 坐标 */
  y: number;
  /** 行高 */
  height: number;
}

export interface TextLayoutResult {
  lines: LayoutLine[];
  totalHeight: number;
}

const DEFAULT_STYLE: TextStyle = {
  fontSize: 16,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#24292f',
};

/** 布局缓存：文本+宽度+样式 → 布局结果 */
const layoutCache = new LRUCache<string, TextLayoutResult>(200);

export class CanvasTextRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;

  constructor(ctx: CanvasRenderingContext2D, width: number) {
    this.ctx = ctx;
    this.width = width;
  }

  /**
   * 计算文本布局（带缓存）
   */
  layout(text: string, style: Partial<TextStyle> = {}): TextLayoutResult {
    const mergedStyle = { ...DEFAULT_STYLE, ...style };
    const cacheKey = `${text}|${this.width}|${JSON.stringify(mergedStyle)}`;

    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;

    const result = this.computeLayout(text, mergedStyle);
    layoutCache.set(cacheKey, result);
    return result;
  }

  /**
   * 在 Canvas 上绘制文本
   */
  draw(layout: TextLayoutResult, offsetY: number): void {
    for (const line of layout.lines) {
      for (const seg of line.segments) {
        this.ctx.save();
        this.applyStyle(seg.style);

        // 代码背景
        if (seg.style.backgroundColor) {
          this.ctx.fillStyle = seg.style.backgroundColor;
          this.ctx.fillRect(seg.x, line.y + offsetY - seg.style.fontSize, seg.width, line.height);
        }

        this.ctx.fillStyle = seg.style.color;
        this.ctx.fillText(seg.text, seg.x, line.y + offsetY);
        this.ctx.restore();
      }
    }
  }

  // ─── 内部方法 ────────────────────

  private computeLayout(text: string, style: TextStyle): TextLayoutResult {
    this.applyStyle(style);

    const words = text.split(/(\s+)/);
    const lines: LayoutLine[] = [];
    let currentLine: LayoutLine['segments'] = [];
    let currentX = 0;
    let currentY = style.fontSize * 1.6; // 首行 baseline
    const lineHeight = style.fontSize * 1.6;

    for (const word of words) {
      const width = this.ctx.measureText(word).width;

      if (currentX + width > this.width && currentLine.length > 0) {
        // 换行
        lines.push({ segments: currentLine, y: currentY, height: lineHeight });
        currentLine = [];
        currentX = 0;
        currentY += lineHeight;
      }

      currentLine.push({ text: word, style, x: currentX, width });
      currentX += width;
    }

    if (currentLine.length > 0) {
      lines.push({ segments: currentLine, y: currentY, height: lineHeight });
    }

    return {
      lines,
      totalHeight: currentY + lineHeight * 0.4,
    };
  }

  private applyStyle(style: TextStyle): void {
    this.ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  }
}
