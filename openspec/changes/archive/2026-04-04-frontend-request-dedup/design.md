## Context

当前前端 gRPC 调用存在三个问题：
1. StrictMode 导致读请求重复发送
2. `createClient()` 散落在 10+ 个文件中（4 stores + 4 组件 + Vue 子应用）
3. `useEffect` + loading/error 状态管理在每个组件中重复实现

## Design

### Decision 1: Dedup Interceptor（在 transport 层去重）

在 `lib/connect.ts` 添加一个 Connect Interceptor，对 **unary（一元）读请求** 做去重：

```typescript
// lib/connect.ts
const dedupInterceptor: Interceptor = (next) => {
  const inflight = new Map<string, Promise<any>>();

  return async (req) => {
    // 只对非变更方法去重（Get/List 开头的方法）
    const method = req.method.name;
    if (!method.startsWith('Get') && !method.startsWith('List')) {
      return next(req);
    }

    // 生成请求签名：service + method + 序列化参数
    const key = `${req.method.I.typeName}/${method}:${JSON.stringify(req.message)}`;

    const existing = inflight.get(key);
    if (existing) {
      return existing; // 复用进行中的请求
    }

    const promise = next(req).finally(() => {
      // 请求完成后延迟清理（覆盖 StrictMode 的 ~10ms 间隔）
      setTimeout(() => inflight.delete(key), 100);
    });

    inflight.set(key, promise);
    return promise;
  };
};

export const transport = createGrpcWebTransport({
  baseUrl: '/',
  interceptors: [authInterceptor, dedupInterceptor],
});
```

**为什么 100ms？** StrictMode unmount→remount 间隔约 10ms，100ms 留足余量。普通用户手动触发的重复操作间隔远大于 100ms，不会误命中。

### Decision 2: 集中管理 gRPC Clients

创建 `lib/grpc-clients.ts`，所有 client 实例集中导出：

```typescript
// lib/grpc-clients.ts
import { createClient } from '@connectrpc/connect';
import { ArticleService, CommentService, SocialService, UserService } from '@luhanxin/shared-types';
import { transport } from './connect';

export const userClient = createClient(UserService, transport);
export const articleClient = createClient(ArticleService, transport);
export const commentClient = createClient(CommentService, transport);
export const socialClient = createClient(SocialService, transport);
```

所有 stores 和组件改为 `import { articleClient } from '@/lib/grpc-clients'`。

### Decision 3: useGrpcQuery Hook

创建通用查询 hook，封装 loading/error/abort 逻辑：

```typescript
// hooks/useGrpcQuery.ts
export function useGrpcQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    queryFn(ctrl.signal)
      .then((res) => { if (!ctrl.signal.aborted) setData(res); })
      .catch((err) => { if (!ctrl.signal.aborted) setError(err.message); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, deps);

  return { data, loading, error };
}
```

组件使用：
```tsx
const { data, loading } = useGrpcQuery(
  (signal) => userClient.getUserByUsername({ username }, { signal }),
  [username],
);
```

## Migration Strategy

1. **Phase 1**（零破坏）：添加 dedup interceptor 到 transport — 立即生效，无需改其他代码
2. **Phase 2**：创建 `grpc-clients.ts`，逐文件迁移 `createClient` 调用
3. **Phase 3**：创建 `useGrpcQuery`，逐组件迁移 useEffect 模式
