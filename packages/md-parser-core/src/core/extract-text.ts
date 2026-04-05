import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * 从 mdast AST 提取纯文本（用于搜索索引）
 */
export function extractPlainText(ast: Root): string {
  const textSegments: string[] = [];

  visit(ast, (node: any) => {
    if (node.type === 'text') {
      textSegments.push(node.value);
    } else if (node.type === 'code') {
      // 跳过代码块（或可选保留）
      // textSegments.push(node.value);
    }
  });

  return textSegments.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * 统计字数（中文按字符，英文按单词）
 */
export function countWords(text: string): number {
  // 中文按字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

  // 英文按单词数
  const englishWords = text
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return chineseChars + englishWords;
}

/**
 * 估算阅读时间（分钟）
 */
export function estimateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = countWords(text);
  return Math.ceil(words / wordsPerMinute);
}
