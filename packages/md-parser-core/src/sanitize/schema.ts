import { defaultSchema } from 'rehype-sanitize';

// 从 rehype-sanitize 导出的 Schema 类型
type Schema = NonNullable<Parameters<typeof import('rehype-sanitize').default>[0]>;

/**
 * 自定义 XSS 防护 Schema
 *
 * 扩展默认 schema，允许：
 * - Shiki 代码高亮（span + style + data 属性）
 * - Mermaid SVG 图表
 * - KaTeX 数学公式
 * - 自定义语法元素（mention/hashtag/container）
 * - rehype-code-meta 注入的代码块 wrapper
 * - rehype-heading-ids 注入的锚点链接
 *
 * 注意：rehype-sanitize 是唯一的 XSS 防护层。
 * 不再提供冗余的手写 sanitizeHtml/containsDangerousContent 函数
 * （GLM 版本中这两个函数与 rehype-sanitize 功能重复且不可靠）。
 */
export const customSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // Mermaid SVG 元素
    'svg',
    'path',
    'g',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'marker',
    'title',
    'desc',
    'use',
    'image',
    // KaTeX 元素
    'mjx-container',
    'mjx-assistive-mml',
    // rehype-code-meta wrapper
    'button',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // 允许所有元素的 class 属性
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class'],
    // Shiki 高亮元素
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['style', /^--shiki-/],
      'data-line',
      'data-lang',
    ],
    // 自定义语法元素 + 外链 + 锚点
    a: [
      ...(defaultSchema.attributes?.a || []),
      'class',
      'className',
      'data-username',
      'data-tag',
      'target',
      'rel',
      'ariaHidden',
      'tabIndex',
      'href',
    ],
    // Heading 元素保留自生成的 id（防止 rehype-sanitize 添加 user-content- 前缀）
    h1: [...(defaultSchema.attributes?.h1 || []), 'id'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 || []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 || []), 'id'],
    h5: [...(defaultSchema.attributes?.h5 || []), 'id'],
    h6: [...(defaultSchema.attributes?.h6 || []), 'id'],
    div: [
      ...(defaultSchema.attributes?.div || []),
      'class',
      'className',
      'data-lang', // rehype-code-meta
    ],
    // 代码块复制按钮
    button: ['class', 'className', 'type', 'ariaLabel', 'data-code'],
    // 图片懒加载
    img: [...(defaultSchema.attributes?.img || []), 'loading', 'alt'],
    // Mermaid SVG 属性
    svg: [
      ...(defaultSchema.attributes?.svg || []),
      'viewBox',
      'xmlns',
      'width',
      'height',
      'class',
      'aria-labelledby',
      'role',
    ],
    path: [
      ...(defaultSchema.attributes?.path || []),
      'd',
      'class',
      'stroke',
      'stroke-width',
      'fill',
      'marker-end',
      'marker-start',
    ],
    g: [...(defaultSchema.attributes?.g || []), 'class', 'transform', 'clip-path'],
    rect: [
      ...(defaultSchema.attributes?.rect || []),
      'x',
      'y',
      'width',
      'height',
      'class',
      'rx',
      'ry',
    ],
    circle: [...(defaultSchema.attributes?.circle || []), 'cx', 'cy', 'r', 'class'],
    text: [
      ...(defaultSchema.attributes?.text || []),
      'x',
      'y',
      'class',
      'text-anchor',
      'font-size',
      'font-family',
    ],
    tspan: [...(defaultSchema.attributes?.tspan || []), 'x', 'y', 'class', 'dy'],
    // KaTeX 属性
    'mjx-container': ['class', 'style'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https', 'data'],
  },
} as const;
