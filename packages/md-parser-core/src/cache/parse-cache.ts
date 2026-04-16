/**
 * Markdown 解析缓存
 *
 * 以 content + options 的 hash 为 key，ParseResult 为 value。
 * 相同内容和选项的解析请求直接返回缓存结果，跳过 unified pipeline。
 */

import type { RenderOptions } from '../core/render';
import type { ParseResult } from '../types/result';
import { LRUCache } from './lru-cache';

/** 默认缓存容量 */
const DEFAULT_CAPACITY = 50;

/**
 * 简单的字符串 hash（fnv1a 变体）
 * 比 crypto.subtle 快，足够用于缓存 key 去重。
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * 生成缓存 key
 */
function makeCacheKey(content: string, options?: RenderOptions): string {
  const optStr = options ? JSON.stringify(options) : '';
  return fnv1aHash(content + optStr);
}

export class ParseCache {
  private cache: LRUCache<string, ParseResult>;

  constructor(capacity = DEFAULT_CAPACITY) {
    this.cache = new LRUCache(capacity);
  }

  /**
   * 获取缓存的解析结果
   */
  get(content: string, options?: RenderOptions): ParseResult | undefined {
    const key = makeCacheKey(content, options);
    return this.cache.get(key);
  }

  /**
   * 缓存解析结果
   */
  set(content: string, options: RenderOptions | undefined, result: ParseResult): void {
    const key = makeCacheKey(content, options);
    this.cache.set(key, result);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /** 缓存大小 */
  get size(): number {
    return this.cache.size;
  }

  /** 命中率 */
  get hitRate(): number {
    return this.cache.hitRate;
  }

  /** 命中次数 */
  get hits(): number {
    return this.cache.hits;
  }

  /** 未命中次数 */
  get misses(): number {
    return this.cache.misses;
  }
}

/** 全局单例 */
let globalParseCache: ParseCache | null = null;

export function getParseCache(capacity?: number): ParseCache {
  if (!globalParseCache) {
    globalParseCache = new ParseCache(capacity);
  }
  return globalParseCache;
}

export function clearParseCache(): void {
  if (globalParseCache) {
    globalParseCache.clear();
  }
}
