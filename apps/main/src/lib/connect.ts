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
 * Dedup interceptor — 请求去重（解决 React StrictMode 双重请求）
 *
 * 对 Get/List 开头的读方法做去重：同一个请求签名（service + method + 参数）
 * 在 100ms 窗口内只真正发一次网络请求，后续复用第一次的 Promise。
 *
 * 为什么 100ms？StrictMode unmount→remount 间隔约 10ms，100ms 留足余量。
 * 普通用户手动触发的重复操作间隔远大于 100ms，不会误命中。
 */
const dedupInterceptor: Interceptor = (next) => {
  const inflight = new Map<string, Promise<any>>();

  return async (req) => {
    const method = req.method.name;

    // 只对读方法去重，变更方法（Create/Update/Delete）不去重
    if (!method.startsWith('Get') && !method.startsWith('List')) {
      return next(req);
    }

    // 生成请求签名：service 全限定名 + method + 序列化参数
    const key = `${req.method.parent.typeName}/${method}:${JSON.stringify(req.message)}`;

    const existing = inflight.get(key);
    if (existing) {
      return existing; // 复用进行中的请求
    }

    const promise = next(req).finally(() => {
      // 请求完成后延迟清理，覆盖 StrictMode 的 ~10ms 间隔
      setTimeout(() => inflight.delete(key), 100);
    });

    inflight.set(key, promise);
    return promise;
  };
};

/**
 * gRPC-Web Transport 配置
 * 连接到 Gateway HTTP 服务，使用 gRPC-Web 协议 + Protobuf
 *
 * - 开发环境：Vite dev server proxy 转发到 Gateway (localhost:8000)
 * - 生产环境：Nginx / K8s Ingress 反代到 Gateway
 * - 拦截器链：Auth（附加 JWT） → Dedup（读请求去重）
 */
export const transport = createGrpcWebTransport({
  baseUrl: '/',
  interceptors: [authInterceptor, dedupInterceptor],
});
