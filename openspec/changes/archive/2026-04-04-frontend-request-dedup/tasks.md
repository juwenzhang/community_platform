## Phase 1: Dedup Interceptor（零破坏，立即生效）

- [x] 1.1 在 `apps/main/src/lib/connect.ts` 添加 `dedupInterceptor` — 基于请求签名（service+method+参数）对 Get/List 方法去重，100ms 窗口
- [x] 1.2 在 `apps/user-profile/src/lib/connect.ts` 同步添加 `dedupInterceptor`
- [x] 1.3 验证：typecheck 通过

## Phase 2: 集中管理 gRPC Clients

- [x] 2.1 创建 `apps/main/src/lib/grpc-clients.ts` — 集中导出 `userClient`、`articleClient`、`commentClient`、`socialClient`
- [x] 2.2 迁移 4 个 stores — `useAuthStore`、`useArticleStore`、`useCommentStore`、`useSocialStore` 改为 `import { xxxClient } from '@/lib/grpc-clients'`，删除各自的 `createClient` 调用
- [x] 2.3 迁移 3 个组件 — `ArticleList/index.tsx`、`UserList/index.tsx`、`pages/user/index.tsx` 改为引用集中 client
- [x] 2.4 迁移 `EditProfileForm/index.tsx` — 从动态 `import()` 改为静态引用 `grpc-clients.ts`

## Phase 3: useGrpcQuery Hook

- [x] 3.1 创建 `apps/main/src/hooks/useGrpcQuery.ts` — 通用 gRPC 查询 hook（loading/error/data + AbortController）
- [x] 3.2 重构 `UserList/index.tsx` — 使用 `useGrpcQuery` 替代手写 useEffect（删除 `fetchedRef` hack）
- [x] 3.3 重构 `pages/user/index.tsx` — `UserProfilePage` 使用 `useGrpcQuery`
- [x] 3.4 验证全项目 typecheck — `pnpm typecheck` 通过
