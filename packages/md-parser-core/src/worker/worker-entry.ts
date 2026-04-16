/**
 * Worker 线程入口
 *
 * 监听主线程的 postMessage，根据请求类型分发到对应的 handler。
 * 错误通过 WorkerResponse.error 传回主线程。
 */
import type {
  MermaidWorkerPayload,
  ParseWorkerPayload,
  WorkerRequest,
  WorkerResponse,
} from '../types/worker';
import { handleMermaid } from './mermaid-worker';
import { handleParse } from './parse-worker';

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const startTime = performance.now();

  try {
    let result: unknown;

    switch (request.type) {
      case 'parse':
        result = await handleParse(request.payload as ParseWorkerPayload);
        break;

      case 'mermaid':
        result = await handleMermaid(request.payload as MermaidWorkerPayload);
        break;

      default:
        throw new Error(`Unknown worker request type: ${request.type}`);
    }

    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      result,
      duration: performance.now() - startTime,
    };

    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const response: WorkerResponse = {
      id: request.id,
      type: request.type,
      error: message,
      duration: performance.now() - startTime,
    };

    self.postMessage(response);
  }
};
