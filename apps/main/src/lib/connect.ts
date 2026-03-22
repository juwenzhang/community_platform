import { createGrpcWebTransport } from '@connectrpc/connect-web';

/**
 * gRPC-Web Transport 配置
 * 连接到 Gateway HTTP 服务，使用 gRPC-Web 协议 + Protobuf
 *
 * - 开发环境：Vite dev server proxy 转发到 Gateway (localhost:8000)
 * - 生产环境：Nginx / K8s Ingress 反代到 Gateway
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
});
