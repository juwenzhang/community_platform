/**
 * 字形纹理 Atlas（LRU 管理）
 *
 * 将常用字形的 SDF 纹理打包到一张大纹理中（texture atlas），
 * 减少 draw call 和纹理切换开销。
 *
 * 使用 LRU 策略管理 atlas 空间，当 atlas 满时驱逐最久未使用的字形。
 */
import { LRUCache } from '../../cache/lru-cache';
import type { GlyphMetrics } from './sdf-font';
import { SDFFont } from './sdf-font';

export interface AtlasEntry {
  /** 字形在 atlas 纹理中的 UV 坐标 (0-1) */
  u: number;
  v: number;
  /** 字形在 atlas 纹理中的尺寸 (0-1) */
  uWidth: number;
  vHeight: number;
  /** 字形指标 */
  metrics: GlyphMetrics;
}

export interface GlyphAtlasOptions {
  /** Atlas 纹理尺寸（必须是 2 的幂，默认 2048） */
  textureSize?: number;
  /** 每个字形的 SDF 大小（默认 48） */
  glyphSize?: number;
  /** LRU 缓存容量（字形数量，默认 1024） */
  capacity?: number;
}

export class GlyphAtlas {
  private textureSize: number;
  private glyphSize: number;
  private sdfFont: SDFFont;
  private cache: LRUCache<string, AtlasEntry>;
  private textureData: Uint8Array;
  private nextSlotX = 0;
  private nextSlotY = 0;
  private dirty = false;

  /** WebGL 纹理对象（由外部 renderer 设置） */
  texture: WebGLTexture | null = null;

  constructor(options: GlyphAtlasOptions = {}) {
    this.textureSize = options.textureSize ?? 2048;
    this.glyphSize = options.glyphSize ?? 48;
    this.sdfFont = new SDFFont({ sdfSize: this.glyphSize });
    this.cache = new LRUCache(options.capacity ?? 1024);
    this.textureData = new Uint8Array(this.textureSize * this.textureSize);
  }

  /**
   * 获取字形在 atlas 中的位置（自动生成缺失字形）
   */
  getGlyph(char: string): AtlasEntry {
    const cached = this.cache.get(char);
    if (cached) return cached;

    // 生成 SDF
    const { sdfData, metrics } = this.sdfFont.generateGlyph(char);

    // 分配 atlas 槽位
    const slot = this.allocateSlot();

    // 写入纹理数据
    this.writeToTexture(sdfData, slot.x, slot.y);

    const entry: AtlasEntry = {
      u: slot.x / this.textureSize,
      v: slot.y / this.textureSize,
      uWidth: this.glyphSize / this.textureSize,
      vHeight: this.glyphSize / this.textureSize,
      metrics,
    };

    this.cache.set(char, entry);
    this.dirty = true;

    return entry;
  }

  /**
   * 检查是否有脏数据需要上传到 GPU
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * 标记纹理数据已上传
   */
  markClean(): void {
    this.dirty = false;
  }

  /**
   * 获取纹理数据（用于上传到 GPU）
   */
  getTextureData(): Uint8Array {
    return this.textureData;
  }

  get atlasSize(): number {
    return this.textureSize;
  }

  destroy(): void {
    this.sdfFont.destroy();
    this.cache.clear();
  }

  // ─── 内部方法 ────────────────────

  private allocateSlot(): { x: number; y: number } {
    const x = this.nextSlotX;
    const y = this.nextSlotY;

    this.nextSlotX += this.glyphSize;
    if (this.nextSlotX + this.glyphSize > this.textureSize) {
      this.nextSlotX = 0;
      this.nextSlotY += this.glyphSize;
    }

    // Atlas 满了，回到起点（覆盖最旧的字形）
    if (this.nextSlotY + this.glyphSize > this.textureSize) {
      this.nextSlotX = 0;
      this.nextSlotY = 0;
    }

    return { x, y };
  }

  private writeToTexture(sdfData: Float32Array, startX: number, startY: number): void {
    for (let y = 0; y < this.glyphSize; y++) {
      for (let x = 0; x < this.glyphSize; x++) {
        const srcIdx = y * this.glyphSize + x;
        const dstIdx = (startY + y) * this.textureSize + (startX + x);
        this.textureData[dstIdx] = Math.round(sdfData[srcIdx] * 255);
      }
    }
  }
}
