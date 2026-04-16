/**
 * WorkerManager — Worker 生命周期管理
 *
 * 职责：
 * 1. 创建和管理 Web Worker 实例
 * 2. 通过 WorkerRequest/WorkerResponse 协议通信
 * 3. 消息去重：相同 content hash 的请求只发一次，后续共享 Promise
 * 4. 自动判断是否启用 Worker（文档 > 阈值字数时启用）
 * 5. Worker 不可用时（如 SSR / 不支持 Worker）优雅降级到主线程
 */
import type { ParseResult } from '../types/result';
import type {
  MermaidWorkerPayload,
  ParseWorkerPayload,
  WorkerRequest,
  WorkerResponse,
} from '../types/worker';

/** 默认阈值：文档超过 5000 字时启用 Worker */
const DEFAULT_WORKER_THRESHOLD = 5000;

/** 请求 ID 计数器 */
let requestIdCounter = 0;

function generateRequestId(): string {
  return `req-${++requestIdCounter}-${Date.now()}`;
}

/**
 * 简单的字符串 hash（用于消息去重）
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export interface WorkerManagerOptions {
  /** Worker 启用阈值（字符数，默认 5000） */
  workerThreshold?: number;
  /** 是否强制禁用 Worker */
  disableWorker?: boolean;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  /** 消息去重：content hash → pending Promise */
  private dedupeMap = new Map<string, Promise<any>>();
  private workerThreshold: number;
  private disableWorker: boolean;

  constructor(options: WorkerManagerOptions = {}) {
    this.workerThreshold = options.workerThreshold ?? DEFAULT_WORKER_THRESHOLD;
    this.disableWorker = options.disableWorker ?? false;
  }

  /**
   * 判断是否应该启用 Worker
   */
  shouldUseWorker(charCount: number): boolean {
    if (this.disableWorker) return false;
    if (typeof Worker === 'undefined') return false; // SSR 环境
    return charCount > this.workerThreshold;
  }

  /**
   * 初始化 Worker（延迟创建）
   */
  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker-entry.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          this.pendingRequests.delete(response.id);

          if (response.error) {
            pending.reject(new Error(response.error));
          } else {
            pending.resolve(response.result);
          }
        }
      };

      this.worker.onerror = (error) => {
        // Worker 级别错误：reject 所有 pending 请求
        for (const [id, pending] of this.pendingRequests) {
          pending.reject(new Error(`Worker error: ${error.message}`));
          this.pendingRequests.delete(id);
        }
      };
    }

    return this.worker;
  }

  /**
   * 向 Worker 发送请求
   */
  private sendRequest<T>(request: WorkerRequest): Promise<T> {
    const worker = this.ensureWorker();

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });
      worker.postMessage(request);
    });
  }

  /**
   * 在 Worker 中解析 Markdown
   *
   * 支持消息去重：相同 content 的并发请求只发一次，共享 Promise。
   */
  async parseInWorker(payload: ParseWorkerPayload): Promise<ParseResult> {
    const dedupeKey = `parse:${simpleHash(payload.markdown)}`;

    // 检查是否有相同请求正在执行
    const existing = this.dedupeMap.get(dedupeKey);
    if (existing) return existing as Promise<ParseResult>;

    const promise = this.sendRequest<ParseResult>({
      id: generateRequestId(),
      type: 'parse',
      payload,
    }).finally(() => {
      this.dedupeMap.delete(dedupeKey);
    });

    this.dedupeMap.set(dedupeKey, promise);
    return promise;
  }

  /**
   * 在 Worker 中渲染 Mermaid 图表
   *
   * Mermaid 始终在 Worker 中执行（不受阈值限制）。
   */
  async renderMermaidInWorker(payload: MermaidWorkerPayload): Promise<{ svg: string }> {
    return this.sendRequest<{ svg: string }>({
      id: generateRequestId(),
      type: 'mermaid',
      payload,
    });
  }

  /**
   * 销毁 Worker 实例
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject 所有 pending 请求
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('WorkerManager destroyed'));
    }
    this.pendingRequests.clear();
    this.dedupeMap.clear();
  }
}

/** 全局单例 */
let globalWorkerManager: WorkerManager | null = null;

/**
 * 获取全局 WorkerManager 单例
 */
export function getWorkerManager(options?: WorkerManagerOptions): WorkerManager {
  if (!globalWorkerManager) {
    globalWorkerManager = new WorkerManager(options);
  }
  return globalWorkerManager;
}

/**
 * 销毁全局 WorkerManager 单例
 */
export function destroyWorkerManager(): void {
  if (globalWorkerManager) {
    globalWorkerManager.destroy();
    globalWorkerManager = null;
  }
}
