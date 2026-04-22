import { describe, expect, it } from 'vitest';
import { countCharacters, countWords, estimateReadingTime } from '../wordCount';

describe('countCharacters', () => {
  it('counts chars without whitespace', () => {
    expect(countCharacters('hello world')).toBe(10);
    expect(countCharacters('中文 测试')).toBe(4);
    expect(countCharacters('')).toBe(0);
    expect(countCharacters('   ')).toBe(0);
  });
});

describe('countWords', () => {
  it('counts English words', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('The quick brown fox')).toBe(4);
  });

  it('counts each CJK character as 1', () => {
    expect(countWords('中文测试')).toBe(4);
    expect(countWords('你好，世界')).toBe(4);
  });

  it('mixed language', () => {
    expect(countWords('hello 中文 world')).toBe(4); // 2 EN + 2 CJK
    expect(countWords('React 组件')).toBe(3); // 1 EN word + 2 CJK chars
  });

  it('handles empty and whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('\n\t')).toBe(0);
  });

  it('ignores punctuation', () => {
    expect(countWords('hello, world!')).toBe(2);
    expect(countWords('中文，测试。')).toBe(4);
  });
});

describe('estimateReadingTime', () => {
  it('returns at least 1 minute', () => {
    expect(estimateReadingTime('hello')).toBe(1);
    expect(estimateReadingTime('')).toBe(1);
  });

  it('scales with word count', () => {
    // 默认 wpm=300，600 词应该 2 分钟
    const text = Array.from({ length: 600 }, () => 'word').join(' ');
    expect(estimateReadingTime(text)).toBe(2);
  });

  it('respects custom wpm', () => {
    const text = Array.from({ length: 500 }, () => '字').join('');
    expect(estimateReadingTime(text, 500)).toBe(1);
    expect(estimateReadingTime(text, 250)).toBe(2);
  });
});
