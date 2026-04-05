import { defaultSchema } from 'rehype-sanitize';

// 从 rehype-sanitize 导出的 Schema 类型
type Schema = NonNullable<Parameters<typeof import('rehype-sanitize').default>[0]>;

/**
 * 自定义 XSS 防护 Schema
 *
 * 扩展默认 schema，允许：
 * - Shiki 代码高亮（大量 span + class）
 * - Mermaid SVG 图表
 * - KaTeX 数学公式
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
  ],
  attributes: {
    ...defaultSchema.attributes,
    // 允许所有元素的 class 属性（任何值）
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className'],
    // Shiki 高亮元素和自定义元素
    span: [
      ...(defaultSchema.attributes?.span || []),
      // 允许 shiki 相关的 style 属性
      ['style', /^--shiki-/],
      'data-line',
      'data-lang',
      'data-username',
      'data-tag',
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      // 允许 a 标签的任何 class
      'className',
      'data-username',
      'data-tag',
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      // 允许 div 标签的任何 class
      'className',
    ],
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
  // 协议白名单
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https', 'data'],
  },
} as const;

/**
 * 检查是否包含危险内容
 */
export function containsDangerousContent(html: string): boolean {
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
    /<iframe[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:\s*text\/html/gi,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(html));
}

/**
 * 移除危险内容
 */
export function sanitizeHtml(html: string): string {
  // 简单的预处理，实际防护由 rehype-sanitize 完成
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');
}
