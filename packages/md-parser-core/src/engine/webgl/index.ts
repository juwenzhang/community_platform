/**
 * Level 3: WebGL/WebGPU 渲染策略
 *
 * 基于 GPU 的文本渲染，每个字符一个 quad，通过 instanced draw call 批量绘制。
 * 字形使用 SDF 纹理 atlas 缓存。交互元素用 DOM overlay。
 *
 * 适用于超大文档（> 200000 字或含大量图表/公式）。
 */
import type { RenderStrategy } from '../../types/engine';
import type { ParseResult } from '../../types/result';
import type { DocumentLayout } from '../canvas/block-layout';
import { computeDocumentLayout, getVisibleBlocks } from '../canvas/block-layout';
import { OverlayManager } from '../canvas/overlay-manager';
import { GlyphAtlas } from './glyph-atlas';
import type { CharInstance } from './renderer';
import { WebGLTextRenderer } from './renderer';
import type { GPUContext } from './webgpu-adapter';
import { createGPUContext } from './webgpu-adapter';

export class WebGLStrategy implements RenderStrategy {
  readonly name = 'webgl' as const;

  private wrapper: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gpuContext: GPUContext | null = null;
  private textRenderer: WebGLTextRenderer | null = null;
  private glyphAtlas: GlyphAtlas | null = null;
  private overlayContainer: HTMLElement | null = null;
  private overlayManager: OverlayManager | null = null;
  private documentLayout: DocumentLayout | null = null;
  private currentResult: ParseResult | null = null;
  private scrollTop = 0;
  private viewportHeight = 0;
  private handleScroll: (() => void) | null = null;
  private atlasTexture: WebGLTexture | null = null;

  async mount(container: HTMLElement, result: ParseResult): Promise<void> {
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

    // 初始化 GPU 上下文（自动选择 WebGPU/WebGL2/WebGL）
    try {
      this.gpuContext = await createGPUContext(this.canvas);
    } catch {
      // GPU 初始化失败，策略会被降级
      throw new Error('WebGL/WebGPU initialization failed');
    }

    // 初始化渲染器和字形 atlas
    if (this.gpuContext.gl) {
      this.textRenderer = new WebGLTextRenderer(this.gpuContext.gl);
      this.glyphAtlas = new GlyphAtlas();

      // 创建 atlas 纹理
      const gl = this.gpuContext.gl;
      this.atlasTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // Overlay 容器
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.style.position = 'absolute';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100%';
    this.overlayContainer.style.pointerEvents = 'none';
    this.wrapper.appendChild(this.overlayContainer);
    this.overlayManager = new OverlayManager(this.overlayContainer);

    // 布局计算
    this.documentLayout = computeDocumentLayout(result.blocks);
    this.canvas.height = this.documentLayout.totalHeight;

    // 滚动监听
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
    this.textRenderer?.destroy();
    this.glyphAtlas?.destroy();
    this.overlayManager?.clear();

    if (this.atlasTexture && this.gpuContext?.gl) {
      this.gpuContext.gl.deleteTexture(this.atlasTexture);
    }

    if (this.wrapper?.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }

    this.wrapper = null;
    this.canvas = null;
    this.gpuContext = null;
    this.textRenderer = null;
    this.glyphAtlas = null;
    this.atlasTexture = null;
    this.overlayContainer = null;
    this.overlayManager = null;
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
    if (
      !this.gpuContext?.gl ||
      !this.textRenderer ||
      !this.glyphAtlas ||
      !this.atlasTexture ||
      !this.documentLayout ||
      !this.currentResult
    ) {
      return;
    }

    const gl = this.gpuContext.gl;
    const { startIndex, endIndex } = getVisibleBlocks(
      this.documentLayout,
      this.scrollTop,
      this.viewportHeight,
    );

    // 清除
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 收集可视区域内的字符实例
    const instances: CharInstance[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const block = this.currentResult.blocks[i];
      const layout = this.documentLayout.blocks[i];
      const text = stripHtml(block.html);

      let x = 16;
      const y = layout.y;

      for (const char of text) {
        const glyph = this.glyphAtlas.getGlyph(char);
        const fontSize = block.type === 'heading' ? 24 : 16;

        instances.push({
          x,
          y: y + fontSize,
          u: glyph.u,
          v: glyph.v,
          uWidth: glyph.uWidth,
          vHeight: glyph.vHeight,
          width: fontSize,
          height: fontSize,
          r: 0.14,
          g: 0.16,
          b: 0.18,
          a: 1,
        });

        x += glyph.metrics.advance * (fontSize / 48);
      }
    }

    // 上传 atlas 纹理（如果有新字形）
    if (this.glyphAtlas.isDirty()) {
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE,
        this.glyphAtlas.atlasSize,
        this.glyphAtlas.atlasSize,
        0,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        this.glyphAtlas.getTextureData(),
      );
      this.glyphAtlas.markClean();
    }

    // 执行 draw call
    this.textRenderer.draw(instances, this.atlasTexture, this.scrollTop);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
