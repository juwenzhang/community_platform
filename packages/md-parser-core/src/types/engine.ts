import type { ParseResult } from './result';

/**
 * 渲染策略接口
 *
 * 四级渲染引擎（DOM / 虚拟列表 / Canvas / WebGL）统一实现此接口。
 * 通过 `detectRenderLevel()` 根据文档复杂度自动选择策略。
 */
export interface RenderStrategy {
  /** 策略名称 */
  readonly name: RenderLevel;

  /** 初始挂载到 DOM 容器 */
  mount(container: HTMLElement, result: ParseResult): void;
  /** 内容更新（增量或全量） */
  update(result: ParseResult): void;
  /** 卸载并清理资源 */
  unmount(): void;
  /** 滚动到指定标题锚点 */
  scrollTo(headingId: string): void;
  /** 获取当前可视区域的 block 范围 */
  getVisibleRange(): { startBlock: number; endBlock: number };
}

/**
 * 渲染级别
 */
export type RenderLevel = 'dom' | 'virtual-list' | 'canvas' | 'webgl';

/**
 * 文档复杂度指标
 *
 * 由 `detectRenderLevel()` 计算，用于自动选择渲染策略。
 */
export interface DocumentComplexity {
  /** 总字符数 */
  charCount: number;
  /** 块级元素数量 */
  blockCount: number;
  /** 代码块数量 */
  codeBlockCount: number;
  /** Mermaid 图表数量 */
  mermaidCount: number;
  /** 图片数量 */
  imageCount: number;
  /** 表格数量 */
  tableCount: number;
}

/**
 * 渲染引擎配置
 */
export interface RenderEngineOptions {
  /** 强制指定渲染级别（跳过自动检测） */
  forceLevel?: RenderLevel;
  /** 虚拟列表的 buffer 大小（前后各多渲染多少个 block） */
  virtualListBuffer?: number;
  /** 自定义复杂度阈值 */
  thresholds?: {
    /** DOM → 虚拟列表 的分数阈值（默认 50） */
    virtualList?: number;
    /** 虚拟列表 → Canvas 的分数阈值（默认 500） */
    canvas?: number;
    /** Canvas → WebGL 的分数阈值（默认 2000） */
    webgl?: number;
  };
}
