/**
 * 代码块扩展
 *
 * 基于 @tiptap/extension-code-block-lowlight，只注册常用 20 种语言。
 * 其他语言未来可通过 `<DocEditor extraLanguages={...}>` 按需扩展。
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
// 常用 20 种语言 — 覆盖 80% 技术文章场景
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import toml from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

/**
 * 预注册语言列表
 *
 * NOTE: toml 用 ini 的语法（highlight.js 未单独实现 toml，但 ini 基本一致）
 * html 用 xml（highlight.js 的约定）
 */
export const REGISTERED_LANGUAGES = [
  'bash',
  'c',
  'cpp',
  'css',
  'dockerfile',
  'go',
  'html',
  'java',
  'javascript',
  'json',
  'kotlin',
  'markdown',
  'nginx',
  'python',
  'rust',
  'shell',
  'sql',
  'swift',
  'toml',
  'typescript',
  'yaml',
] as const;

/**
 * 创建预配置的 lowlight 实例
 */
function createConfiguredLowlight() {
  const lowlight = createLowlight();
  lowlight.register('bash', bash);
  lowlight.register('c', c);
  lowlight.register('cpp', cpp);
  lowlight.register('css', css);
  lowlight.register('dockerfile', dockerfile);
  lowlight.register('go', go);
  lowlight.register('html', xml);
  lowlight.register('java', java);
  lowlight.register('javascript', javascript);
  lowlight.register('js', javascript);
  lowlight.register('json', json);
  lowlight.register('kotlin', kotlin);
  lowlight.register('markdown', markdown);
  lowlight.register('md', markdown);
  lowlight.register('nginx', nginx);
  lowlight.register('python', python);
  lowlight.register('py', python);
  lowlight.register('rust', rust);
  lowlight.register('rs', rust);
  lowlight.register('shell', shell);
  lowlight.register('sh', shell);
  lowlight.register('sql', sql);
  lowlight.register('swift', swift);
  lowlight.register('toml', toml);
  lowlight.register('typescript', typescript);
  lowlight.register('ts', typescript);
  lowlight.register('yaml', yaml);
  lowlight.register('yml', yaml);
  lowlight.register('xml', xml);
  return lowlight;
}

/**
 * 配置好的 CodeBlock 扩展
 *
 * NodeView（带语言选择器和复制按钮）在后续任务中实现，当前先用默认渲染。
 */
export const CodeBlock = CodeBlockLowlight.configure({
  lowlight: createConfiguredLowlight(),
  defaultLanguage: null,
  HTMLAttributes: {
    class: 'code-block',
  },
});
