import type { Interceptor } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

const TOKEN_KEY = 'luhanxin_auth_token';

/**
 * Auth interceptor — 自动附加 JWT token 到每个请求
 *
 * 从 localStorage 读取 token，如果存在则设置 Authorization header。
 * 这样前端所有 gRPC 请求都会自动携带认证信息。
 */
const authInterceptor: Interceptor = (next) => async (req) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req.header.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
};

/**
 * gRPC-Web Transport 配置
 * 连接到 Gateway HTTP 服务，使用 gRPC-Web 协议 + Protobuf
 *
 * - 开发环境：Vite dev server proxy 转发到 Gateway (localhost:8000)
 * - 生产环境：Nginx / K8s Ingress 反代到 Gateway
 * - 自动附加 JWT Authorization header（如果已登录）
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
  interceptors: [authInterceptor],
});
