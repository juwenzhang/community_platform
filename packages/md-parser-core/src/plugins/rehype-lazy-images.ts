import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * rehype-lazy-images 插件
 *
 * 给 `<img>` 元素添加 `loading="lazy"` 属性，
 * 实现浏览器原生的图片懒加载。
 *
 * 首屏图片（第一张）不添加 lazy，避免 LCP 指标受影响。
 */
export const rehypeLazyImages: Plugin<[], Root> = () => (tree: Root) => {
  let imageIndex = 0;

  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'img') return;

    if (!node.properties) node.properties = {};

    // 首屏第一张图片不 lazy，避免影响 LCP
    if (imageIndex > 0) {
      node.properties.loading = 'lazy';
    }

    // 确保有 alt 属性（无障碍）
    if (!node.properties.alt) {
      node.properties.alt = '';
    }

    imageIndex++;
  });
};
