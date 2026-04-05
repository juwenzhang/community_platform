/**
 * Level 1: 虚拟列表渲染策略
 *
 * 将文档按 block 粒度分割，使用 IntersectionObserver 监听可视区域，
 * 只渲染可视区域 ± buffer 的 block DOM，其余用占位 div 替代。
 *
 * 适用于中等文档（5000-50000 字, 20-200 block）。
 */
import type { RenderStrategy } from '../types/engine';
import type { BlockNode, ParseResult } from '../types/result';

const DEFAULT_BUFFER_SIZE = 5;

export interface VirtualListOptions {
  /** 前后各多渲染多少个 block（默认 5） */
  bufferSize?: number;
}

export class VirtualListStrategy implements RenderStrategy {
  readonly name = 'virtual-list' as const;
  private container: HTMLElement | null = null;
  private blocks: BlockNode[] = [];
  private blockElements: (HTMLElement | null)[] = [];
  private observer: IntersectionObserver | null = null;
  private visibleSet = new Set<number>();
  private bufferSize: number;
  private scrollContainer: HTMLElement | null = null;

  constructor(options?: VirtualListOptions) {
    this.bufferSize = options?.bufferSize ?? DEFAULT_BUFFER_SIZE;
  }

  mount(container: HTMLElement, result: ParseResult): void {
    this.container = container;
    this.blocks = result.blocks;
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    // 创建所有 block 的占位元素
    this.blockElements = this.blocks.map((block, index) => {
      const el = document.createElement('div');
      el.dataset.blockIndex = String(index);
      el.dataset.blockType = block.type;
      el.style.minHeight = `${block.estimatedHeight}px`;
      this.container!.appendChild(el);
      return el;
    });

    // 设置 IntersectionObserver
    this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries), {
      rootMargin: '200px 0px',
    });

    for (const el of this.blockElements) {
      if (el) this.observer.observe(el);
    }
  }

  update(result: ParseResult): void {
    this.unmount();
    if (this.container) {
      this.mount(this.container, result);
    }
  }

  unmount(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.blockElements = [];
    this.visibleSet.clear();
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }

  scrollTo(headingId: string): void {
    if (!this.container) return;

    // 找到包含该标题的 block
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i].type === 'heading' && this.blocks[i].html.includes(`id="${headingId}"`)) {
        this.renderBlock(i);
        const el = this.blockElements[i];
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  getVisibleRange(): { startBlock: number; endBlock: number } {
    if (this.visibleSet.size === 0) {
      return { startBlock: 0, endBlock: 0 };
    }
    const sorted = [...this.visibleSet].sort((a, b) => a - b);
    return {
      startBlock: sorted[0],
      endBlock: sorted[sorted.length - 1],
    };
  }

  // ─── 内部方法 ────────────────────

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const index = Number((entry.target as HTMLElement).dataset.blockIndex);
      if (Number.isNaN(index)) continue;

      if (entry.isIntersecting) {
        this.visibleSet.add(index);
      } else {
        this.visibleSet.delete(index);
      }
    }

    this.updateRenderedBlocks();
  }

  private updateRenderedBlocks(): void {
    if (this.visibleSet.size === 0) return;

    const sorted = [...this.visibleSet].sort((a, b) => a - b);
    const minVisible = sorted[0];
    const maxVisible = sorted[sorted.length - 1];

    const renderStart = Math.max(0, minVisible - this.bufferSize);
    const renderEnd = Math.min(this.blocks.length - 1, maxVisible + this.bufferSize);

    for (let i = 0; i < this.blocks.length; i++) {
      if (i >= renderStart && i <= renderEnd) {
        this.renderBlock(i);
      } else {
        this.clearBlock(i);
      }
    }
  }

  private renderBlock(index: number): void {
    const el = this.blockElements[index];
    if (!el || el.dataset.rendered === 'true') return;

    el.innerHTML = this.blocks[index].html;
    el.dataset.rendered = 'true';
    el.style.minHeight = ''; // 让真实内容决定高度
  }

  private clearBlock(index: number): void {
    const el = this.blockElements[index];
    if (!el || el.dataset.rendered !== 'true') return;

    // 记录真实高度用于占位
    const realHeight = el.getBoundingClientRect().height;
    el.innerHTML = '';
    el.dataset.rendered = 'false';
    el.style.minHeight = `${realHeight}px`;
  }
}
