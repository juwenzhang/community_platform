/**
 * Worker 内的解析逻辑
 *
 * 在 Web Worker 线程中执行完整的 unified pipeline。
 * Shiki WASM 在 Worker 中加载和执行，不阻塞主线程。
 */

import { renderMarkdown } from '../core/render';
import type { ParseResult } from '../types/result';
import type { ParseWorkerPayload } from '../types/worker';

export async function handleParse(payload: ParseWorkerPayload): Promise<ParseResult> {
  const { markdown, options = {} } = payload;

  const result = await renderMarkdown(markdown, {
    gfm: options.gfm ?? true,
    math: options.math ?? true,
    frontmatter: options.frontmatter ?? true,
    sanitize: options.sanitize ?? true,
    highlight: options.highlight ?? true,
    customSyntax: options.customSyntax ?? true,
    postProcess: options.postProcess ?? true,
  });

  return result;
}
