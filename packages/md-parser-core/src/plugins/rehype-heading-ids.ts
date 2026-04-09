import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * rehype-heading-ids 插件
 *
 * 给 h1-h6 元素注入：
 * 1. `id` 属性（从标题文本生成 slug）
 * 2. 锚点链接 `<a class="heading-anchor" href="#slug" aria-hidden="true">#</a>`
 *
 * 这使得 TOC 的页内跳转生效（GLM 版本完全遗漏了标题 id 注入）。
 */
export const rehypeHeadingIds: Plugin<[], Root> = () => (tree: Root) => {
  const slugCounts = new Map<string, number>();

  visit(tree, 'element', (node: Element) => {
    const tagName = node.tagName;
    if (!/^h[1-6]$/.test(tagName)) return;

    // 提取标题文本
    const text = extractText(node);
    if (!text) return;

    // 生成 slug
    let slug = generateSlug(text);

    // 处理重复 slug
    const count = slugCounts.get(slug) || 0;
    if (count > 0) {
      slug = `${slug}-${count}`;
    }
    slugCounts.set(slug, count + 1);

    // 注入 id 属性
    if (!node.properties) node.properties = {};
    node.properties.id = slug;

    // 注入锚点链接（作为第一个子元素）
    const anchor: Element = {
      type: 'element',
      tagName: 'a',
      properties: {
        class: 'heading-anchor',
        href: `#${slug}`,
        ariaHidden: 'true',
        tabIndex: -1,
      },
      children: [{ type: 'text', value: '#' }],
    };

    node.children.unshift(anchor);
  });
};

/**
 * 从 hast 元素递归提取纯文本
 */
function extractText(node: Element): string {
  let text = '';
  for (const child of node.children) {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'element') {
      text += extractText(child);
    }
  }
  return text;
}

/**
 * 生成 URL-safe slug
 * 支持中英文混合，保留中文字符
 */
function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '') || 'heading'
  );
}
