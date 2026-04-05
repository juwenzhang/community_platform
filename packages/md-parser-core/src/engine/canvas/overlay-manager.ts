/**
 * Canvas DOM Overlay 管理器
 *
 * 管理 Canvas 上方的 DOM 覆盖层，用于渲染需要鼠标交互的元素：
 * - 链接 <a>
 * - 图片 <img>
 * - 代码块复制按钮 <button>
 *
 * 这些元素用绝对定位覆盖在 Canvas 的对应位置上。
 */

export interface OverlayItem {
  id: string;
  type: 'link' | 'image' | 'button';
  element: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OverlayManager {
  private container: HTMLElement;
  private overlays = new Map<string, OverlayItem>();

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.style.position = 'relative';
  }

  /**
   * 添加或更新一个 overlay
   */
  set(item: OverlayItem): void {
    const existing = this.overlays.get(item.id);
    if (existing) {
      this.updatePosition(existing.element, item);
      existing.x = item.x;
      existing.y = item.y;
      existing.width = item.width;
      existing.height = item.height;
    } else {
      this.updatePosition(item.element, item);
      item.element.style.position = 'absolute';
      item.element.style.pointerEvents = 'auto';
      this.container.appendChild(item.element);
      this.overlays.set(item.id, item);
    }
  }

  /**
   * 移除指定 overlay
   */
  remove(id: string): void {
    const item = this.overlays.get(id);
    if (item) {
      item.element.remove();
      this.overlays.delete(id);
    }
  }

  /**
   * 根据滚动位置更新所有 overlay 的 y 坐标
   */
  updateScroll(scrollTop: number): void {
    for (const item of this.overlays.values()) {
      item.element.style.top = `${item.y - scrollTop}px`;
    }
  }

  /**
   * 清除所有 overlay
   */
  clear(): void {
    for (const item of this.overlays.values()) {
      item.element.remove();
    }
    this.overlays.clear();
  }

  private updatePosition(
    element: HTMLElement,
    pos: { x: number; y: number; width: number; height: number },
  ): void {
    element.style.left = `${pos.x}px`;
    element.style.top = `${pos.y}px`;
    element.style.width = `${pos.width}px`;
    element.style.height = `${pos.height}px`;
  }
}
