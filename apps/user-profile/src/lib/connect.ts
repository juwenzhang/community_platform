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

/** Dedup interceptor — 读请求去重（解决 StrictMode 双重请求） */
const dedupInterceptor: Interceptor = (next) => {
  const inflight = new Map<string, Promise<any>>();

  return async (req) => {
    const method = req.method.name;
    if (!method.startsWith('Get') && !method.startsWith('List')) {
      return next(req);
    }

    const key = `${req.method.parent.typeName}/${method}:${JSON.stringify(req.message)}`;
    const existing = inflight.get(key);
    if (existing) return existing;

    const promise = next(req).finally(() => {
      setTimeout(() => inflight.delete(key), 100);
    });
    inflight.set(key, promise);
    return promise;
  };
};

/**
 * Vue 子应用的 Connect transport
 * 与主应用共享同一个 localStorage token + dedup 策略
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
  interceptors: [authInterceptor, dedupInterceptor],
});
