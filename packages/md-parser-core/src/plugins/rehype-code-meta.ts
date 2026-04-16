import type { Element, Root, Text } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * rehype-code-meta 插件
 *
 * 给代码块（`<pre><code>`）注入 wrapper 结构：
 *
 * ```html
 * <div class="code-block-wrapper" data-lang="typescript">
 *   <span class="code-block-lang">typescript</span>
 *   <button class="code-block-copy" type="button" aria-label="复制代码">📋</button>
 *   <pre class="..."><code class="language-typescript">...</code></pre>
 * </div>
 * ```
 *
 * 这使得通过 dangerouslySetInnerHTML 渲染的代码块也能有：
 * - 语言标签显示
 * - 复制按钮（通过事件代理捕获 click）
 * - data-code 属性（复制时获取原始代码文本）
 *
 * GLM 版本的 CodeBlock 组件是独立组件，和 innerHTML 渲染的代码块完全分离，
 * 复制按钮根本不会出现在渲染结果中。
 */
export const rehypeCodeMeta: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, 'element', (node: Element, index, parent) => {
    if (node.tagName !== 'pre') return;
    if (!parent || index === undefined || index === null) return;

    // 查找 <pre> 内的 <code> 元素
    const codeElement = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    );
    if (!codeElement) return;

    // 提取语言（从 class="language-xxx" 中）
    const language = extractLanguage(codeElement);

    // 提取代码文本（用于复制按钮的 data-code）
    const codeText = extractCodeText(codeElement);

    // 创建 wrapper
    const wrapper: Element = {
      type: 'element',
      tagName: 'div',
      properties: {
        className: ['code-block-wrapper'],
        ...(language ? { 'data-lang': language } : {}),
      },
      children: [
        // 语言标签
        ...(language
          ? [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['code-block-lang'] },
                children: [{ type: 'text', value: language } as Text],
              } as Element,
            ]
          : []),
        // 复制按钮
        {
          type: 'element',
          tagName: 'button',
          properties: {
            className: ['code-block-copy'],
            type: 'button',
            ariaLabel: '复制代码',
            'data-code': codeText,
          },
          children: [{ type: 'text', value: '📋' } as Text],
        } as Element,
        // 原始 <pre> 元素
        node,
      ],
    };

    // 替换原 <pre> 为 wrapper
    parent.children[index] = wrapper;
  });
};

/**
 * 从 <code> 元素的 className 中提取语言
 */
function extractLanguage(codeElement: Element): string | null {
  const classNames = codeElement.properties?.className;
  if (!Array.isArray(classNames)) return null;

  for (const cls of classNames) {
    if (typeof cls === 'string' && cls.startsWith('language-')) {
      return cls.slice('language-'.length);
    }
  }
  return null;
}

/**
 * 从 <code> 元素中递归提取纯文本
 */
function extractCodeText(node: Element): string {
  let text = '';
  for (const child of node.children) {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'element') {
      text += extractCodeText(child);
    }
  }
  return text;
}
