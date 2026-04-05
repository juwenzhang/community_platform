import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export interface ExternalLinksOptions {
  /** 视为内部链接的域名列表（默认只有当前域名） */
  internalDomains?: string[];
}

/**
 * rehype-external-links 插件
 *
 * 检测 `<a href="...">` 是否为外链，自动添加：
 * - `target="_blank"`
 * - `rel="noopener noreferrer"`
 * - CSS class `external-link`
 *
 * 内部链接（相对路径 / 锚点 / 配置的内部域名）不受影响。
 */
export const rehypeExternalLinks: Plugin<[ExternalLinksOptions?], Root> =
  (options = {}) =>
  (tree: Root) => {
    const internalDomains = new Set(options.internalDomains || []);

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      // 跳过内部链接
      if (isInternalLink(href, internalDomains)) return;

      // 添加外链属性
      if (!node.properties) node.properties = {};
      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';

      // 添加外链 CSS class
      const existing = node.properties.className;
      if (Array.isArray(existing)) {
        if (!existing.includes('external-link')) {
          existing.push('external-link');
        }
      } else {
        node.properties.className = ['external-link'];
      }
    });
  };

/**
 * 判断是否为内部链接
 */
function isInternalLink(href: string, internalDomains: Set<string>): boolean {
  // 相对路径
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return true;
  }

  // 锚点链接
  if (href.startsWith('#')) {
    return true;
  }

  // mailto/tel
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return true;
  }

  // 检查域名
  try {
    const url = new URL(href);
    return internalDomains.has(url.hostname);
  } catch {
    // 无法解析的 URL 视为内部链接
    return true;
  }
}
