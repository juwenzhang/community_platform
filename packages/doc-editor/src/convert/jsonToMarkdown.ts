/**
 * ProseMirror JSON → Markdown 转换器
 *
 * 实现策略：递归序列化 PM JSON 节点。
 *
 * 保真范围（Phase 1）：与 markdownToJson 对称。
 *
 * 设计准则：
 * - 输出保证可被 markdownToJson 再次解析为等价结构（round-trip 等价性）
 * - 输出遵循 CommonMark + GFM 规范（除自定义扩展）
 * - 规范化：连续空行折叠为单空行、尾部空白清理
 */

import type { ProseMirrorJSON } from '../types/editor';

type Mark = { type: string; attrs?: Record<string, unknown> };

/**
 * 将 ProseMirror JSON 文档序列化为 Markdown 字符串
 */
export function jsonToMarkdown(json: ProseMirrorJSON): string {
  if (json.type !== 'doc') {
    throw new Error(`Expected root type 'doc', got '${json.type}'`);
  }
  const children = json.content ?? [];
  const blocks = children.map((node) => serializeBlock(node, 0)).filter(Boolean);
  return normalize(blocks.join('\n\n'));
}

function serializeBlock(node: ProseMirrorJSON, depth: number): string {
  switch (node.type) {
    case 'paragraph':
      return serializeInlines(node.content ?? []);
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      const prefix = '#'.repeat(Math.min(Math.max(level, 1), 6));
      return `${prefix} ${serializeInlines(node.content ?? [])}`;
    }
    case 'bulletList':
      return serializeBulletList(node, depth);
    case 'orderedList':
      return serializeOrderedList(node, depth);
    case 'taskList':
      return serializeTaskList(node, depth);
    case 'listItem':
      // 不应直接落到 block 层，但给一个降级
      return (node.content ?? []).map((c) => serializeBlock(c, depth)).join('\n\n');
    case 'blockquote':
      return serializeBlockquote(node);
    case 'codeBlock':
      return serializeCodeBlock(node);
    case 'horizontalRule':
      return '---';
    case 'hardBreak':
      return '  \n';
    case 'table':
      return serializeTable(node);
    // 自定义块
    case 'container':
      return serializeContainer(node);
    case 'mermaid':
      return serializeMermaid(node);
    case 'blockMath':
      return serializeBlockMath(node);
    default:
      // biome-ignore lint/suspicious/noExplicitAny: 未知节点
      console.warn(`[doc-editor] Unknown block type on serialize: ${node.type}`);
      return '';
  }
}

function serializeContainer(node: ProseMirrorJSON): string {
  const type = (node.attrs?.type as string) ?? 'tip';
  const title = (node.attrs?.title as string | null | undefined) ?? '';
  const header = title ? `:::${type} ${title}` : `:::${type}`;
  const inner = (node.content ?? []).map((c) => serializeBlock(c, 0)).join('\n\n');
  return `${header}\n${inner}\n:::`;
}

function serializeMermaid(node: ProseMirrorJSON): string {
  const code = (node.attrs?.code as string) ?? '';
  return `\`\`\`mermaid\n${code}\n\`\`\``;
}

function serializeBlockMath(node: ProseMirrorJSON): string {
  const formula = (node.attrs?.formula as string) ?? '';
  return `$$\n${formula}\n$$`;
}

function serializeBulletList(node: ProseMirrorJSON, depth: number): string {
  const indent = '  '.repeat(depth);
  const items = (node.content ?? []).map((item) => serializeListItem(item, '-', indent, depth));
  return items.join('\n');
}

function serializeOrderedList(node: ProseMirrorJSON, depth: number): string {
  const indent = '  '.repeat(depth);
  const start = Number(node.attrs?.start ?? 1);
  const items = (node.content ?? []).map((item, idx) =>
    serializeListItem(item, `${start + idx}.`, indent, depth),
  );
  return items.join('\n');
}

function serializeTaskList(node: ProseMirrorJSON, depth: number): string {
  const indent = '  '.repeat(depth);
  const items = (node.content ?? []).map((item) => {
    const checked = item.attrs?.checked === true ? 'x' : ' ';
    const body = serializeListItemBody(item.content ?? [], depth + 1);
    return `${indent}- [${checked}] ${body}`;
  });
  return items.join('\n');
}

function serializeListItem(
  item: ProseMirrorJSON,
  marker: string,
  indent: string,
  depth: number,
): string {
  const body = serializeListItemBody(item.content ?? [], depth + 1);
  return `${indent}${marker} ${body}`;
}

function serializeListItemBody(content: ProseMirrorJSON[], depth: number): string {
  if (content.length === 0) return '';
  const parts: string[] = [];
  for (const [i, child] of content.entries()) {
    const text = serializeBlock(child, depth);
    if (i === 0 && child.type === 'paragraph') {
      // 首段落直接作为列表项首行文本
      parts.push(text);
    } else {
      // 后续块内容缩进到列表项的文本列
      const pad = '  '.repeat(depth);
      parts.push('');
      parts.push(
        text
          .split('\n')
          .map((line) => (line ? `${pad}${line}` : line))
          .join('\n'),
      );
    }
  }
  return parts.join('\n');
}

function serializeBlockquote(node: ProseMirrorJSON): string {
  const inner = (node.content ?? []).map((c) => serializeBlock(c, 0)).join('\n\n');
  return inner
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function serializeCodeBlock(node: ProseMirrorJSON): string {
  const language = (node.attrs?.language as string | null | undefined) ?? '';
  const code = (node.content ?? []).map((c) => c.text ?? '').join('');
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

function serializeTable(node: ProseMirrorJSON): string {
  const rows = node.content ?? [];
  if (rows.length === 0) return '';

  // 收集每行单元格文本
  const cellTexts: string[][] = rows.map((row) =>
    (row.content ?? []).map((cell) => {
      const text = (cell.content ?? [])
        .map((b) => serializeBlock(b, 0))
        .join(' ')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
      return text;
    }),
  );

  const headerRow = cellTexts[0];
  const bodyRows = cellTexts.slice(1);

  const sep = headerRow.map(() => '---').join(' | ');
  const lines: string[] = [];
  lines.push(`| ${headerRow.join(' | ')} |`);
  lines.push(`| ${sep} |`);
  for (const row of bodyRows) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines.join('\n');
}

function serializeInlines(nodes: ProseMirrorJSON[]): string {
  return nodes.map(serializeInline).join('');
}

function serializeInline(node: ProseMirrorJSON): string {
  if (node.type === 'hardBreak') {
    return '  \n';
  }
  if (node.type === 'image') {
    const src = (node.attrs?.src as string) ?? '';
    const alt = (node.attrs?.alt as string | null | undefined) ?? '';
    const title = node.attrs?.title ? ` "${node.attrs.title}"` : '';
    return `![${alt}](${src}${title})`;
  }
  if (node.type === 'inlineMath') {
    const formula = (node.attrs?.formula as string) ?? '';
    return `$${formula}$`;
  }
  if (node.type === 'text') {
    return applyMarks(node.text ?? '', node.marks ?? []);
  }
  // 未知 inline，降级为文本内容
  // biome-ignore lint/suspicious/noExplicitAny: 未知节点
  console.warn(`[doc-editor] Unknown inline type on serialize: ${node.type}`);
  return node.text ?? '';
}

/**
 * 将 marks 按固定顺序应用到文本上，保证 round-trip 稳定
 *
 * Mark 应用顺序（从内到外）：code → strike → emphasis → strong → link
 * 这和 markdown 规范的嵌套习惯一致：**_text_** 而不是 _**text**_
 */
function applyMarks(text: string, marks: Mark[]): string {
  const markSet = new Set(marks.map((m) => m.type));
  let out = text;

  // 优先级从内到外
  if (markSet.has('code')) {
    out = `\`${out}\``;
  }
  if (markSet.has('strike')) {
    out = `~~${out}~~`;
  }
  if (markSet.has('italic')) {
    out = `*${out}*`;
  }
  if (markSet.has('bold')) {
    out = `**${out}**`;
  }

  // link 总是最外层
  const linkMark = marks.find((m) => m.type === 'link');
  if (linkMark) {
    const href = (linkMark.attrs?.href as string) ?? '';
    const title = linkMark.attrs?.title ? ` "${linkMark.attrs.title}"` : '';
    out = `[${out}](${href}${title})`;
  }

  return out;
}

/**
 * 规范化：折叠 3+ 连续换行为 2 个、清理首尾空白
 */
function normalize(md: string): string {
  return md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[ \t]+$/gm, '');
}
