/**
 * 通用 LRU (Least Recently Used) 缓存
 *
 * 基于 Map 实现（Map 保留插入顺序），O(1) get/set。
 * 当缓存满时，驱逐最久未使用的条目。
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly capacity: number;

  /** 缓存命中次数（可观测性） */
  hits = 0;
  /** 缓存未命中次数 */
  misses = 0;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error('LRU capacity must be >= 1');
    this.capacity = capacity;
  }

  /**
   * 获取缓存值。命中时将条目移到最新位置。
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    // 移到最新位置（Map 的 delete + set 保证顺序）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存。超出容量时驱逐最旧条目。
   */
  set(key: K, value: V): void {
    // 如果已存在，先删除（更新位置）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // 驱逐最旧条目
    if (this.cache.size > this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * 检查是否存在（不改变 LRU 顺序）
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除指定条目
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** 当前缓存大小 */
  get size(): number {
    return this.cache.size;
  }

  /** 命中率 */
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}
