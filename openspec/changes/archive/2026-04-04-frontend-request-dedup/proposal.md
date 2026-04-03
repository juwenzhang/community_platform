# Frontend Request Deduplication

## Problem

React 18 StrictMode 在开发模式下会 unmount → remount 组件，导致 `useEffect` 执行两次，同一个 gRPC 请求发两遍。虽然生产环境不会触发，但：

1. **开发体验差** — 后端日志看到重复请求，干扰调试
2. **浪费带宽** — 两次请求完全相同，第二次毫无意义
3. **竞态风险** — 两次请求的响应可能以不同顺序返回，导致状态闪烁

## Proposal

在 Connect RPC transport 层添加 **请求去重拦截器（dedup interceptor）**：同一个请求（相同 service + method + 参数）在短时间内发两次时，复用第一次的 Promise，不真正发第二次网络请求。

**不移除 StrictMode** — StrictMode 的双重渲染对发现副作用 bug 有价值，只需在网络层去重。

## Goals

1. 创建 `dedup interceptor` — Connect RPC 拦截器，基于请求签名去重
2. 统一 gRPC client 创建 — 散落在 10+ 个文件中的 `createClient()` 收敛到 `lib/grpc-clients.ts`
3. 统一 AbortController 模式 — 提取 `useGrpcQuery` hook，封装 useEffect + abort + loading/error 状态

## Non-Goals

- 不移除 StrictMode
- 不引入 React Query / TanStack Query（过重，当前规模不需要）
- 不改后端

## Impact

| 文件 | 变更 |
|------|------|
| `lib/connect.ts` | 添加 dedup interceptor |
| `lib/grpc-clients.ts` | 新建：集中管理所有 gRPC client |
| `hooks/useGrpcQuery.ts` | 新建：通用 gRPC 查询 hook |
| 4 个 stores | 改为引用 `lib/grpc-clients.ts` |
| 4 个组件（ArticleList, UserList, UserProfilePage, EditProfileForm） | 改为引用集中 client 或使用 `useGrpcQuery` |
| Vue 子应用 `connect.ts` | 同步添加 dedup interceptor |

## Risks

| 风险 | 缓解 |
|------|------|
| dedup 误命中（不同请求被当成相同） | 签名包含完整序列化参数，概率极低 |
| 缓存过期策略不当 | 默认 100ms 窗口，仅防 StrictMode 双重调用 |
