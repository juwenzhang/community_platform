import type { Interceptor } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

const TOKEN_KEY = 'luhanxin_auth_token';

/** Auth interceptor — 自动附加 JWT token 到每个请求 */
const authInterceptor: Interceptor = (next) => async (req) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req.header.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
};

/**
 * Vue 子应用的 Connect transport
 * 与主应用共享同一个 localStorage token
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
  interceptors: [authInterceptor],
});
