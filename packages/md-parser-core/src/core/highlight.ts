import { codeToHtml } from 'shiki';

/**
 * Shiki 代码高亮配置
 */
export interface HighlightOptions {
  /** 代码语言 */
  lang: string;
  /** 主题（支持双主题） */
  theme?: {
    dark?: string;
    light?: string;
  };
}

/**
 * 使用 Shiki 高亮代码
 */
export async function highlightCode(code: string, options: HighlightOptions): Promise<string> {
  const { lang, theme } = options;

  try {
    const html = await codeToHtml(code, {
      lang: lang || 'text',
      themes: theme || {
        dark: 'github-dark',
        light: 'github-light',
      },
    });
    return html;
  } catch (error) {
    console.warn(`Failed to highlight code with lang ${lang}:`, error);
    // Fallback: 返回纯文本
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 常用语言列表（按需加载）
 */
export const COMMON_LANGUAGES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'bash',
  'sql',
  'json',
  'yaml',
  'markdown',
  'html',
  'css',
  'scss',
  'less',
];
