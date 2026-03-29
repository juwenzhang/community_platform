import { createGrpcWebTransport } from '@connectrpc/connect-web';

/**
 * Vue 子应用独立的 Connect transport
 * 不依赖 React 主应用的 transport 实例
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
});
