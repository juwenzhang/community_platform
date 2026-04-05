/**
 * Worker 内的 Mermaid SVG 渲染
 *
 * 动态 import mermaid 库，在 Worker 线程中渲染图表为 SVG 字符串。
 * Mermaid 始终在 Worker 中执行（即使是小文档），因为其渲染开销大。
 */
import type { MermaidWorkerPayload } from '../types/worker';

/** Mermaid 渲染超时（ms） */
const MERMAID_TIMEOUT = 5000;

export interface MermaidRenderResult {
  svg: string;
}

export async function handleMermaid(payload: MermaidWorkerPayload): Promise<MermaidRenderResult> {
  const { code, id, theme = 'default' } = payload;

  // 动态加载 mermaid（延迟加载，减少 Worker 初始化时间）
  const mermaid = await import('mermaid');

  mermaid.default.initialize({
    startOnLoad: false,
    theme: theme as 'default' | 'base' | 'dark' | 'forest' | 'neutral',
    securityLevel: 'strict',
  });

  // 超时 + 渲染竞赛
  const result = await Promise.race([
    mermaid.default.render(`mermaid-${id}-${Date.now()}`, code),
    timeout(MERMAID_TIMEOUT),
  ]);

  if (!result) {
    throw new Error(`Mermaid 渲染超时 (${MERMAID_TIMEOUT}ms)`);
  }

  return { svg: result.svg };
}

function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}
