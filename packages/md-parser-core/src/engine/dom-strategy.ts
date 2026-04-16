/**
 * Level 0: DOM 渲染策略
 *
 * 最简单的渲染路径：直接将 HTML 设置为容器的 innerHTML。
 * 适用于小文档（< 5000 字, < 20 block）。
 */
import type { RenderStrategy } from '../types/engine';
import type { ParseResult } from '../types/result';

export class DomStrategy implements RenderStrategy {
  readonly name = 'dom' as const;
  private container: HTMLElement | null = null;

  mount(container: HTMLElement, result: ParseResult): void {
    this.container = container;
    container.innerHTML = result.html;
  }

  update(result: ParseResult): void {
    if (this.container) {
      this.container.innerHTML = result.html;
    }
  }

  unmount(): void {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }

  scrollTo(headingId: string): void {
    const el = this.container?.querySelector(`#${CSS.escape(headingId)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getVisibleRange(): { startBlock: number; endBlock: number } {
    return { startBlock: 0, endBlock: Number.MAX_SAFE_INTEGER };
  }
}
