import { createConnectTransport } from '@connectrpc/connect-web';

/**
 * Connect Transport 配置
 * 连接到 Gateway HTTP 服务，使用 Connect Protocol + Protobuf
 */
export const transport = createConnectTransport({
  // Vite dev server 会代理 /api 到 localhost:8000 (Gateway)
  baseUrl: 'http://localhost:8000',
});
