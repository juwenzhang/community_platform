/**
 * SDF (Signed Distance Field) 字体渲染器
 *
 * 使用 SDF 技术在 GPU 上渲染文本：
 * 1. 将字形轮廓转为 SDF 纹理（每像素存储到最近边缘的有符号距离）
 * 2. fragment shader 中根据距离值做 alpha test，实现清晰的文本边缘
 * 3. SDF 纹理可以在不同缩放级别下保持清晰（无需多 mipmap）
 *
 * 参考: Valve SIGGRAPH 2007 "Improved Alpha-Tested Magnification"
 */

export interface GlyphMetrics {
  /** 字形在 atlas 中的 UV 坐标 */
  u: number;
  v: number;
  /** 字形在 atlas 中的尺寸 */
  width: number;
  height: number;
  /** 字形的 advance width（水平推进量） */
  advance: number;
  /** 基线偏移 */
  bearingX: number;
  bearingY: number;
}

export interface SDFFontOptions {
  /** SDF 纹理分辨率（每个字形的像素大小，默认 48） */
  sdfSize?: number;
  /** SDF 扩展半径（默认 8） */
  sdfRadius?: number;
  /** 字体族 */
  fontFamily?: string;
}

/**
 * SDF 字形生成器
 *
 * 通过 Canvas 2D 渲染字形到临时 Canvas，
 * 然后计算每个像素的 SDF 值。
 */
export class SDFFont {
  private sdfSize: number;
  private sdfRadius: number;
  private fontFamily: string;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;

  constructor(options: SDFFontOptions = {}) {
    this.sdfSize = options.sdfSize ?? 48;
    this.sdfRadius = options.sdfRadius ?? 8;
    this.fontFamily = options.fontFamily ?? '-apple-system, sans-serif';

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = this.sdfSize;
    this.tempCanvas.height = this.sdfSize;
    this.tempCtx = this.tempCanvas.getContext('2d')!;
  }

  /**
   * 生成单个字符的 SDF 数据
   *
   * @returns SDF 像素数据（Float32Array，范围 0-1）和字形指标
   */
  generateGlyph(char: string): { sdfData: Float32Array; metrics: GlyphMetrics } {
    const size = this.sdfSize;
    const ctx = this.tempCtx;
    const padding = this.sdfRadius;

    // 清除
    ctx.clearRect(0, 0, size, size);

    // 绘制字形
    const fontSize = size - padding * 2;
    ctx.font = `${fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';

    const measured = ctx.measureText(char);
    const xOffset = (size - measured.width) / 2;

    ctx.fillText(char, xOffset, padding);

    // 获取像素数据
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    // 计算 SDF（简化版，实际应用中使用更精确的算法）
    const sdfData = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const alpha = pixels[(y * size + x) * 4 + 3] / 255;
        // 简化 SDF：直接用 alpha 作为距离近似
        sdfData[y * size + x] = alpha > 0.5 ? 0.75 : 0.25;
      }
    }

    return {
      sdfData,
      metrics: {
        u: 0,
        v: 0,
        width: size,
        height: size,
        advance: measured.width,
        bearingX: xOffset,
        bearingY: padding,
      },
    };
  }

  destroy(): void {
    // 清理临时 Canvas
  }
}
