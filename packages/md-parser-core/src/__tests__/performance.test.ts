import { describe, expect, it } from 'vitest';
import { LRUCache } from '../cache/lru-cache';
import { ParseCache } from '../cache/parse-cache';
import { detectRenderLevel } from '../engine/detect';
import { lineDiff } from '../incremental/diff';
import type { ParseResult } from '../types/result';

describe('LRU Cache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBeUndefined();
  });

  it('should evict least recently used entry', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('should move accessed item to most recent', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' 变成最新
    cache.set('c', 3); // evicts 'b'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('should track hit rate', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', 1);
    cache.get('a'); // hit
    cache.get('b'); // miss

    expect(cache.hits).toBe(1);
    expect(cache.misses).toBe(1);
    expect(cache.hitRate).toBe(0.5);
  });
});

describe('Line Diff', () => {
  it('should detect identical texts', () => {
    const result = lineDiff('hello\nworld', 'hello\nworld');
    expect(result.identical).toBe(true);
    expect(result.changedRanges).toHaveLength(0);
  });

  it('should detect single line change', () => {
    const result = lineDiff('line1\nline2\nline3', 'line1\nmodified\nline3');
    expect(result.identical).toBe(false);
    expect(result.changedRanges).toHaveLength(1);
    expect(result.changedRanges[0].startLine).toBe(1);
    expect(result.changedRanges[0].endLine).toBe(1);
  });

  it('should detect inserted lines', () => {
    const result = lineDiff('line1\nline2', 'line1\nnew\nline2');
    expect(result.identical).toBe(false);
    expect(result.changedRanges.length).toBeGreaterThan(0);
  });
});

describe('Render Level Detection', () => {
  const makeResult = (charCount: number, blockCount: number): ParseResult => ({
    html: '',
    toc: [],
    meta: {},
    plainText: 'a'.repeat(charCount),
    blocks: Array.from({ length: blockCount }, (_, i) => ({
      type: 'paragraph' as const,
      html: '',
      startLine: i,
      endLine: i,
      estimatedHeight: 24,
    })),
  });

  it('should return dom for small documents', () => {
    const level = detectRenderLevel(makeResult(1000, 5));
    expect(level).toBe('dom');
  });

  it('should return virtual-list for medium documents', () => {
    const level = detectRenderLevel(makeResult(50000, 100));
    expect(level).toBe('virtual-list');
  });

  it('should return canvas for large documents', () => {
    const level = detectRenderLevel(makeResult(500000, 500));
    expect(level).toBe('canvas');
  });

  it('should return webgl for very large documents', () => {
    const level = detectRenderLevel(makeResult(2000000, 2000));
    expect(level).toBe('webgl');
  });

  it('should respect forceLevel option', () => {
    const level = detectRenderLevel(makeResult(100, 2), { forceLevel: 'canvas' });
    expect(level).toBe('canvas');
  });
});
