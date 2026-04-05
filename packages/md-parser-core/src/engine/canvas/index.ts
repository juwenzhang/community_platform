/**
 * Level 2: Canvas 渲染策略
 *
 * 使用 Canvas 2D API 绘制文本内容，DOM overlay 处理交互元素。
 * 只绘制可视区域 + buffer，滚动时重新绘制。
 *
 * 适用于大文档（50000-200000 字, 200-1000 block）。
 */
import type { RenderStrategy } from '../../types/engine';
import type { ParseResult } from '../../types/result';
import type { DocumentLayout } from './block-layout';
import { computeDocumentLayout, getVisibleBlocks } from './block-layout';
import { OverlayManager } from './overlay-manager';
import { CanvasSelection } from './selection';
import { CanvasTextRenderer } from './text-renderer';

export class CanvasStrategy implements RenderStrategy {
  readonly name = 'canvas' as const;

  private wrapper: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private overlayContainer: HTMLElement | null = null;
  private overlayManager: OverlayManager | null = null;
  private textRenderer: CanvasTextRenderer | null = null;
  private selection: CanvasSelection | null = null;
  private documentLayout: DocumentLayout | null = null;
  private currentResult: ParseResult | null = null;
  private scrollTop = 0;
  private viewportHeight = 0;
  private handleScroll: (() => void) | null = null;

  mount(container: HTMLElement, result: ParseResult): void {
    this.currentResult = result;
    this.viewportHeight = container.clientHeight || 600;

    // 创建 wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'relative';
    this.wrapper.style.overflow = 'auto';
    this.wrapper.style.height = '100%';
    container.appendChild(this.wrapper);

    // 创建 Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth;
    this.canvas.style.display = 'block';
    this.wrapper.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Canvas 2D context not available');
    }

    // 创建 overlay 容器
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.style.position = 'absolute';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100%';
    this.overlayContainer.style.pointerEvents = 'none';
    this.wrapper.appendChild(this.overlayContainer);

    this.overlayManager = new OverlayManager(this.overlayContainer);
    this.textRenderer = new CanvasTextRenderer(this.ctx, this.canvas.width);
    this.selection = new CanvasSelection(this.canvas);

    // 计算布局
    this.documentLayout = computeDocumentLayout(result.blocks);
    this.canvas.height = this.documentLayout.totalHeight;

    // 监听滚动
    this.handleScroll = () => {
      this.scrollTop = this.wrapper?.scrollTop ?? 0;
      this.render();
    };
    this.wrapper.addEventListener('scroll', this.handleScroll, { passive: true });

    this.render();
  }

  update(result: ParseResult): void {
    this.currentResult = result;
    this.documentLayout = computeDocumentLayout(result.blocks);

    if (this.canvas) {
      this.canvas.height = this.documentLayout.totalHeight;
    }

    this.render();
  }

  unmount(): void {
    if (this.handleScroll && this.wrapper) {
      this.wrapper.removeEventListener('scroll', this.handleScroll);
    }
    this.selection?.destroy();
    this.overlayManager?.clear();
    if (this.wrapper?.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }

    this.wrapper = null;
    this.canvas = null;
    this.ctx = null;
    this.overlayContainer = null;
    this.overlayManager = null;
    this.textRenderer = null;
    this.selection = null;
    this.documentLayout = null;
    this.currentResult = null;
  }

  scrollTo(headingId: string): void {
    if (!this.documentLayout || !this.currentResult || !this.wrapper) return;

    for (let i = 0; i < this.currentResult.blocks.length; i++) {
      const block = this.currentResult.blocks[i];
      if (block.type === 'heading' && block.html.includes(`id="${headingId}"`)) {
        const layout = this.documentLayout.blocks[i];
        this.wrapper.scrollTop = layout.y;
        return;
      }
    }
  }

  getVisibleRange(): { startBlock: number; endBlock: number } {
    if (!this.documentLayout) return { startBlock: 0, endBlock: 0 };

    const { startIndex, endIndex } = getVisibleBlocks(
      this.documentLayout,
      this.scrollTop,
      this.viewportHeight,
    );

    return { startBlock: startIndex, endBlock: endIndex };
  }

  // ─── 内部方法 ────────────────────

  private render(): void {
    if (!this.ctx || !this.canvas || !this.documentLayout || !this.currentResult) return;

    const { startIndex, endIndex } = getVisibleBlocks(
      this.documentLayout,
      this.scrollTop,
      this.viewportHeight,
    );

    // 清除画布（只清除可视区域）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制可视区域的 block
    for (let i = startIndex; i <= endIndex; i++) {
      const block = this.currentResult.blocks[i];
      const layout = this.documentLayout.blocks[i];

      // 简化实现：使用 fillText 绘制纯文本
      // 完整实现需要解析 block.html 中的富文本结构
      this.ctx.save();
      this.ctx.fillStyle = '#24292f';
      this.ctx.font = this.getFontForBlock(block.type);

      const text = stripHtml(block.html);
      this.ctx.fillText(text, 16, layout.y + 20, this.canvas.width - 32);
      this.ctx.restore();
    }
  }

  private getFontForBlock(type: string): string {
    switch (type) {
      case 'heading':
        return 'bold 24px -apple-system, sans-serif';
      case 'code':
        return '14px "SF Mono", Consolas, monospace';
      default:
        return '16px -apple-system, sans-serif';
    }
  }
}

/** 简单的 HTML 标签剥离 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
