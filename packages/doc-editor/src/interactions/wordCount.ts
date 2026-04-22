/**
 * 字数 / 阅读时间统计
 *
 * 纯函数 + 轻量 Extension：
 *   - `countWords(text)`: 按"中文字 1 / 英文单词 1"计数
 *   - `estimateReadingTime(text, wpm)`: 估算阅读时间（分钟）
 *   - `WordCountExtension`: 挂在 editor.storage 上，每次 update 自动更新
 *
 * 消费方通过 `editor.storage.wordCount.characters / words / readingTime` 读取。
 */

import { Extension } from '@tiptap/core';

/**
 * 中文字符（CJK 统一表意）正则 —— 每个中文字符视为 1 个 word
 */
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
/**
 * 英文单词正则 —— 连续字母数字视为 1 个 word
 */
const EN_WORD_REGEX = /[a-zA-Z0-9_']+/g;

/**
 * 统计 word 数：中文每字 1，英文每词 1
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjk = text.match(CJK_REGEX)?.length ?? 0;
  const enWords = text.match(EN_WORD_REGEX)?.length ?? 0;
  return cjk + enWords;
}

/**
 * 统计字符数（不含空白符）
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * 估算阅读时间（分钟，最小 1 分钟）
 *
 * @param wpm - 每分钟词数，默认 300（兼顾中文 500 和英文 250）
 */
export function estimateReadingTime(text: string, wpm = 300): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / wpm));
}

export interface WordCountStats {
  characters: number;
  words: number;
  readingTime: number;
}

declare module '@tiptap/core' {
  interface Storage {
    wordCount: WordCountStats;
  }
}

export const WordCount = Extension.create({
  name: 'wordCount',

  addStorage(): WordCountStats {
    return {
      characters: 0,
      words: 0,
      readingTime: 0,
    };
  },

  onUpdate() {
    const text = this.editor.getText();
    const stats = this.editor.storage.wordCount as WordCountStats;
    stats.characters = countCharacters(text);
    stats.words = countWords(text);
    stats.readingTime = estimateReadingTime(text);
  },

  onCreate() {
    // 初始化也算一次（处理 setContent 初始内容）
    const text = this.editor.getText();
    const stats = this.editor.storage.wordCount as WordCountStats;
    stats.characters = countCharacters(text);
    stats.words = countWords(text);
    stats.readingTime = estimateReadingTime(text);
  },
});
