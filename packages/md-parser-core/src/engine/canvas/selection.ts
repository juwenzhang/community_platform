/**
 * Canvas 选区实现
 *
 * 在 Canvas 渲染模式下实现文本选择功能。
 * 通过鼠标事件（mousedown/mousemove/mouseup）追踪选区范围，
 * 将 Canvas 坐标映射到文本偏移量。
 */

export interface SelectionRange {
  /** 起始文本偏移量 */
  startOffset: number;
  /** 结束文本偏移量 */
  endOffset: number;
  /** 选中的文本内容 */
  text: string;
  /** 所在的 block 索引 */
  blockIndex: number;
}

export class CanvasSelection {
  private canvas: HTMLCanvasElement;
  private isSelecting = false;
  private startPos: { x: number; y: number } | null = null;
  private currentRange: SelectionRange | null = null;
  private onSelectionChange?: (range: SelectionRange | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onSelectionChange?: (range: SelectionRange | null) => void,
  ) {
    this.canvas = canvas;
    this.onSelectionChange = onSelectionChange;
    this.bindEvents();
  }

  /**
   * 获取当前选区
   */
  getSelection(): SelectionRange | null {
    return this.currentRange;
  }

  /**
   * 清除选区
   */
  clearSelection(): void {
    this.currentRange = null;
    this.onSelectionChange?.(null);
  }

  /**
   * 销毁，移除事件监听
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
  }

  // ─── 内部方法 ────────────────────

  private bindEvents(): void {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.isSelecting = true;
    this.startPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseMove(_e: MouseEvent): void {
    if (!this.isSelecting) return;
    // 实际实现需要：根据鼠标位置计算选区高亮范围
    // 并在 Canvas 上绘制选区背景色
    // 这里先预留接口
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isSelecting || !this.startPos) return;
    this.isSelecting = false;

    const rect = this.canvas.getBoundingClientRect();
    const endPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // 实际实现需要：将 startPos 和 endPos 映射到文本偏移量
    // 通过 block layout 和 text layout 的坐标信息做 hit-test
    // 这里先预留接口结构
    if (Math.abs(endPos.x - this.startPos.x) > 5 || Math.abs(endPos.y - this.startPos.y) > 5) {
      this.currentRange = {
        startOffset: 0,
        endOffset: 0,
        text: '',
        blockIndex: 0,
      };
      this.onSelectionChange?.(this.currentRange);
    }

    this.startPos = null;
  }
}
