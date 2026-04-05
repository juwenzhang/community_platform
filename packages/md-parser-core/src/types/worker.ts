/**
 * Worker 消息协议类型定义
 *
 * 主线程和 Worker 之间通过 postMessage 通信，
 * 使用 WorkerRequest/WorkerResponse 消息协议。
 */

/**
 * 主线程 → Worker 请求
 */
export interface WorkerRequest {
  /** 请求唯一 ID（用于匹配响应） */
  id: string;
  /** 请求类型 */
  type: 'parse' | 'mermaid';
  /** 请求负载 */
  payload: ParseWorkerPayload | MermaidWorkerPayload;
}

/**
 * 解析请求负载
 */
export interface ParseWorkerPayload {
  /** Markdown 原始文本 */
  markdown: string;
  /** 渲染选项（序列化安全的子集） */
  options?: {
    gfm?: boolean;
    math?: boolean;
    frontmatter?: boolean;
    sanitize?: boolean;
    highlight?: boolean;
    customSyntax?: boolean;
    postProcess?: boolean;
  };
}

/**
 * Mermaid 渲染请求负载
 */
export interface MermaidWorkerPayload {
  /** Mermaid 代码 */
  code: string;
  /** 图表 ID */
  id: string;
  /** Mermaid 主题 */
  theme?: string;
}

/**
 * Worker → 主线程响应
 */
export interface WorkerResponse {
  /** 对应请求的 ID */
  id: string;
  /** 响应类型 */
  type: 'parse' | 'mermaid';
  /** 成功时的结果 */
  result?: unknown;
  /** 失败时的错误信息 */
  error?: string;
  /** 执行耗时（ms） */
  duration?: number;
}
