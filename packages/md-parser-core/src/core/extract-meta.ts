import yaml from 'js-yaml';
import type { Heading, Root, YAML } from 'mdast';
import { visit } from 'unist-util-visit';
import type { ArticleMeta } from '../types';
import { countWords, estimateReadingTime } from './extract-text';

/**
 * 从 mdast AST 提取文章元数据
 */
export function extractMeta(ast: Root, plainText: string): ArticleMeta {
  const meta: ArticleMeta = {};

  // 1. 提取 frontmatter
  visit(ast, 'yaml', (node: YAML) => {
    try {
      const frontmatter = yaml.load(node.value) as Record<string, any>;
      meta.title = frontmatter.title;
      meta.description = frontmatter.description;
      meta.tags = frontmatter.tags;
      meta.date = frontmatter.date;
    } catch (e) {
      console.warn('Failed to parse frontmatter:', e);
    }
  });

  // 2. 如果 frontmatter 没有标题，从第一个 h1 提取
  if (!meta.title) {
    visit(ast, 'heading', (node: Heading) => {
      if (node.depth === 1 && !meta.title) {
        let text = '';
        visit(node, 'text', (child) => {
          text += child.value;
        });
        meta.title = text.trim();
      }
    });
  }

  // 3. 统计字数和阅读时间
  meta.wordCount = countWords(plainText);
  meta.readingTime = estimateReadingTime(plainText);

  return meta;
}
