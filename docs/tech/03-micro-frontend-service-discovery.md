# 微前端服务发现与服务注册

> 技术文档 · `@luhanxin/dev-kit` + `@luhanxin/app-registry`
>
> 版本: v0.1.0 · 日期: 2026-03-21

---

## 目录

1. [问题背景与痛点](#1-问题背景与痛点)
2. [社区方案调研与对比](#2-社区方案调研与对比)
3. [我们的方案设计](#3-我们的方案设计)
4. [核心架构](#4-核心架构)
5. [技术实现详解](#5-技术实现详解)
6. [亮点总结](#6-亮点总结)
7. [难点与解决方案](#7-难点与解决方案)
8. [调试命令速查](#8-调试命令速查)
9. [新增子应用接入指南](#9-新增子应用接入指南)
10. [未来演进方向](#10-未来演进方向)

---

## 1. 问题背景与痛点

### 1.1 微前端开发态的核心挑战

在 Monorepo 微前端架构中，主应用（Host）需要知道子应用（Remote）的真实入口地址，才能通过 Garfish / qiankun / single-spa 等框架加载子应用。

**生产环境**下这不是问题——子应用部署在固定的 CDN 或域名下，地址是确定的。

**开发环境**下却存在一个被广泛忽视的痛点：

```
registry.ts: entry = "http://localhost:5174"  ← 写死的
feed/vite.config.ts: server.port = 5174       ← 写死的

但！端口 5174 被占用时 Vite 自动分配 5175  ← 信息不对称 💥
主应用还傻傻地访问 5174                       ← 加载失败
```

### 1.2 具体痛点清单

| 痛点 | 描述 | 影响 |
|------|------|------|
| **端口硬编码** | 子应用入口 URL 写死为 `localhost:5174` | 端口被占用时加载失败 |
| **端口竞争** | 多个子应用使用 Vite dev server，端口可能冲突 | 需要手动分配不同端口，容易遗忘 |
| **信息不对称** | 主应用不知道子应用的真实运行地址 | 必须手动保持两边同步 |
| **启动顺序耦合** | 开发者需要手动按顺序启动各服务 | 遗漏启动某个子应用导致功能缺失 |
| **多人协作冲突** | 不同开发者的本地端口可能不同 | 无法统一配置 |
| **重启不可预测** | 子应用崩溃重启后可能分配到新端口 | 主应用无法自动感知 |

### 1.3 为什么这个问题在社区中很少被讨论？

大多数微前端项目的开发模式是：

1. **独立开发**：每个子应用独立运行，不需要主应用编排
2. **写死端口**：`strictPort: true` + 手动分配端口段（如 5174、5175、5176...）
3. **环境变量**：通过 `.env` 文件管理不同环境的 URL

这些方案在**小规模团队**或**子应用数量较少**时勉强可用，但当子应用数量增长、团队规模扩大后，维护成本会急剧上升。

---

## 2. 社区方案调研与对比

### 2.1 方案一：硬编码端口 + `strictPort: true`

这是最常见的做法，也是绝大多数微前端教程中使用的方案。

```ts
// 主应用 registry
registerMicroApps([
  { name: 'feed', entry: '//localhost:5174' },
  { name: 'article', entry: '//localhost:5175' },
]);

// 子应用 vite.config.ts
server: { port: 5174, strictPort: true }
```

**代表框架**：qiankun、single-spa、wujie（无界）、micro-app（京东）的官方文档均采用此方式。

| 优点 | 缺点 |
|------|------|
| 简单直观 | 端口冲突时直接报错退出 |
| 零额外依赖 | 多应用需手动规划端口段 |
| 无学习成本 | 不同开发者本地可能端口不同 |
| - | 子应用越多，管理越痛苦 |
| - | 无法处理动态端口场景 |

**评价**：能用但脆弱，属于"能跑就行"级别。

### 2.2 方案二：环境变量 + `.env` 文件

通过环境变量管理不同环境的入口 URL。

```bash
# .env.development
VITE_FEED_URL=http://localhost:5174
VITE_ARTICLE_URL=http://localhost:5175

# .env.production
VITE_FEED_URL=https://cdn.example.com/apps/feed/
VITE_ARTICLE_URL=https://cdn.example.com/apps/article/
```

```ts
// 主应用 registry
const apps = [
  { name: 'feed', entry: import.meta.env.VITE_FEED_URL },
];
```

**代表实践**：很多企业内部的微前端项目采用此方式，是硬编码端口的"进阶版"。

| 优点 | 缺点 |
|------|------|
| 多环境支持好 | 本质上还是硬编码 |
| 符合 12-Factor App | 端口变了还是要手动改 .env |
| 团队共享方便 | .env 文件需要提交到 Git，不够灵活 |
| - | 无法自动感知子应用实际运行端口 |

**评价**：比方案一好，但依然是"静态配置"思路。

### 2.3 方案三：Webpack Module Federation 的 Dynamic Remote

Module Federation（MF）2.0 引入了动态远程模块的概念。

```ts
// Host 运行时动态决定 Remote 的 URL
const remoteUrl = await fetch('/api/remote-manifest')
  .then(res => res.json())
  .then(config => config.feedUrl);

await __webpack_init_sharing__('default');
const container = await import(/* webpackIgnore: true */ remoteUrl);
```

Module Federation 2.0（`@module-federation/enhanced`）支持 `manifest.json` + Runtime Plugin 的方式实现动态服务发现：

```ts
// 通过 manifest.json 声明远程模块
new ModuleFederationPlugin({
  remotes: {
    remote: 'remote@http://localhost:3001/mf-manifest.json',
  },
});
```

| 优点 | 缺点 |
|------|------|
| 运行时动态加载 | 强依赖 Webpack 生态 |
| MF 2.0 原生支持 | 不适用于 HTML Entry 模式（Garfish/qiankun） |
| manifest.json 标准化 | manifest 本身的 URL 还是写死的 |
| 模块级共享能力强 | 开发态的端口问题依然存在 |
| - | Vite 支持不成熟（`@module-federation/vite` 仍实验中） |

**评价**：生产态方案强大，但开发态端口问题并未根本解决。且与 Garfish HTML Entry 模式不兼容。

### 2.4 方案四：后端微服务式注册中心（Consul / Nacos / etcd）

借鉴后端微服务的服务发现模式——搭建一个轻量注册中心，子应用启动后向注册中心注册。

```
子应用 → 注册到 Consul/Nacos → 主应用从注册中心查询
```

部分大型企业（如阿里、字节）的微前端平台采用类似思路，但通常是**运行时从 API 获取子应用列表**：

```ts
// 从后端 API 获取子应用注册表
const apps = await fetch('/api/micro-apps').then(r => r.json());
registerMicroApps(apps);
```

| 优点 | 缺点 |
|------|------|
| 最灵活、最动态 | 引入重量级基础设施（Consul/Nacos） |
| 支持运行时动态上下线 | 开发环境搭建成本极高 |
| 企业级方案，可靠性高 | 前端工程师不熟悉后端注册中心 |
| 支持大规模子应用管理 | 过度设计（对前端开发态而言） |
| - | 本地开发还是需要解决端口发现问题 |

**评价**：适合大型平台的生产环境，但用于本地开发态是"杀鸡用牛刀"。

### 2.5 方案五：反向代理 + 网关路由

通过 Nginx/Caddy 或 Node.js 网关统一转发请求，子应用通过路径区分。

```nginx
location /apps/feed/ {
    proxy_pass http://localhost:5174/;
}
location /apps/article/ {
    proxy_pass http://localhost:5175/;
}
```

| 优点 | 缺点 |
|------|------|
| 子应用路径统一 | Nginx 配置中端口还是写死的 |
| 生产环境常用 | 开发态需额外启动代理服务 |
| 解决跨域问题 | 端口变了还是要改配置 |
| - | HMR WebSocket 转发复杂 |

**评价**：解决了跨域，但端口发现问题只是"转移"了，没有解决。

### 2.6 社区方案对比总结

| 方案 | 动态发现 | 开发态可用 | 零配置 | 端口自适应 | 实现复杂度 | 生态依赖 |
|------|:--------:|:----------:|:------:|:----------:|:----------:|:--------:|
| 硬编码端口 | ❌ | ✅ | ✅ | ❌ | ⭐ | 无 |
| 环境变量 | ❌ | ✅ | ❌ | ❌ | ⭐ | 无 |
| MF Dynamic Remote | ✅ | ⚠️ | ❌ | ❌ | ⭐⭐⭐ | Webpack |
| 后端注册中心 | ✅ | ❌ | ❌ | ✅ | ⭐⭐⭐⭐ | Consul等 |
| 反向代理 | ❌ | ⚠️ | ❌ | ❌ | ⭐⭐ | Nginx |
| **我们的方案** | **✅** | **✅** | **✅** | **✅** | **⭐⭐** | **Vite** |

> **核心差异**：社区方案普遍忽视了"开发态端口自适应"这一痛点，我们的方案专门针对此场景设计。

---

## 3. 我们的方案设计

### 3.1 设计理念

> **开发态服务发现（Dev-time Service Discovery）**：
> 子应用启动后**主动注册**真实地址，主应用**被动发现**可用子应用。

核心思路借鉴后端微服务的**服务注册与发现**模式，但做了大幅简化：

- **注册中心** → 一个共享 JSON 文件（`.dev-registry.json`）
- **服务注册** → Vite 插件在 `httpServer.listening` 后写入文件
- **服务发现** → Vite 中间件暴露 HTTP API，前端轮询读取
- **健康检查** → `kill(pid, 0)` 检测进程存活 + 启动时清理

### 3.2 设计原则

| 原则 | 描述 |
|------|------|
| **零侵入** | 子应用只需添加一个 Vite 插件，不改动业务代码 |
| **自动化** | 端口分配、注册、发现、清理全自动 |
| **容错** | 子应用未启动时 fallback 到静态配置 |
| **最小依赖** | 只依赖 Node.js fs + Vite Plugin API |
| **渐进式** | 不用就不影响，用了就自动生效 |

### 3.3 不使用 WebSocket / IPC 的原因

| 方案 | 为什么不选 |
|------|-----------|
| WebSocket | 需要启动独立的 WS server，增加复杂度和启动时间 |
| IPC (stdin/stdout) | 需要父子进程关系，与 `pnpm -r --parallel` 不兼容 |
| Redis Pub/Sub | 开发态引入 Redis 依赖过重 |
| HTTP Polling | ✅ **简单可靠**，兼容所有 Vite 版本 |
| 共享文件 | ✅ **最简单**，跨平台，无额外进程 |

最终选择：**共享文件（写入端）+ HTTP API（读取端）** 的混合方案。

---

## 4. 核心架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    pnpm dev (scripts/dev.sh)                    │
│                                                                 │
│  1. 清理旧 .dev-registry.json                                    │
│  2. exec pnpm -r --parallel dev                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ 并行启动
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  feed (5174)  │  │ article(5176)│  │  main (5173)  │
   │  Vite + React │  │  Vite + React│  │  Vite + React │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                  │                  │
          │ garfishSubApp()  │ garfishSubApp()  │ devRegistryMiddleware()
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────────────────────────┐  ┌──────────────────┐
   │     .dev-registry.json          │  │ GET /__dev_      │
   │  {                              │◄─│   registry__     │
   │    "feed": { url, port, pid },  │  │                  │
   │    "article": { url, port, pid }│  │ 读取文件返回 JSON │
   │  }                              │  └────────┬─────────┘
   └─────────────────────────────────┘           │
                                                 ▼
                                       ┌──────────────────┐
                                       │ DevConfigProvider │
                                       │ (浏览器端)         │
                                       │                  │
                                       │ fetch → 合并配置  │
                                       │ → 注入 Garfish   │
                                       └──────────────────┘
```

### 4.2 数据流

```
子应用启动 → Vite resolved port → 写入 .dev-registry.json
                                        │
主应用 Vite middleware ← 读取文件 ←──────┘
         │
         ▼
GET /__dev_registry__ → DevConfigProvider → AppRegistry → Garfish
                              │
                        轮询（每3秒）
                        感知新子应用上线
```

### 4.3 包职责划分

| 包名 | 职责 | 运行环境 |
|------|------|---------|
| `@luhanxin/dev-kit` | Vite 插件 + 共享文件读写 | Node.js (Vite Plugin) |
| `@luhanxin/app-registry` | 注册表 + ConfigProvider 抽象 | 浏览器 + Node.js |

```
@luhanxin/dev-kit                     @luhanxin/app-registry
├── src/                              ├── src/
│   ├── types.ts (DevRegistryEntry)   │   ├── types.ts (AppManifest, ConfigProvider)
│   ├── constants.ts                  │   ├── registry.ts (AppRegistry)
│   ├── registry-file.ts (文件读写)    │   ├── providers/
│   └── vite/                         │   │   ├── dev.ts   (DevConfigProvider) ← 新增
│       ├── garfish-sub-app.ts        │   │   ├── env.ts   (EnvConfigProvider)
│       └── dev-registry-middleware.ts│   │   ├── static.ts
│                                     │   │   └── remote.ts
│                                     │   ├── health/
│                                     │   │   └── checker.ts
│                                     │   └── adapters/
│                                     │       └── garfish.ts
```

---

## 5. 技术实现详解

### 5.1 共享注册文件格式 (`.dev-registry.json`)

```json
{
  "version": 1,
  "apps": {
    "feed": {
      "name": "feed",
      "url": "http://localhost:5175",
      "preferredPort": 5174,
      "resolvedPort": 5175,
      "startedAt": 1711024800000,
      "pid": 12345
    },
    "article": {
      "name": "article",
      "url": "http://localhost:5176",
      "preferredPort": 5176,
      "resolvedPort": 5176,
      "startedAt": 1711024801000,
      "pid": 12346
    }
  },
  "updatedAt": 1711024801000
}
```

**关键字段说明**：

| 字段 | 用途 |
|------|------|
| `preferredPort` | 子应用 `vite.config.ts` 中配置的首选端口 |
| `resolvedPort` | Vite 实际分配的端口（可能因占用而不同） |
| `url` | 完整的访问 URL |
| `pid` | 进程 PID，用于僵尸条目检测 |
| `startedAt` | 启动时间戳，用于去重和排序 |
| `version` | 文件格式版本号，未来兼容 |

### 5.2 Vite 插件：`garfishSubApp()` —— 子应用端

```ts
// apps/feed/vite.config.ts
import { garfishSubApp } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [
    react(),
    garfishSubApp({ name: 'feed' }),  // 一行代码接入
  ],
  server: {
    port: 5174,
    strictPort: false,  // 关键：允许端口自动递增
  },
});
```

**核心逻辑**（源码位于 `packages/dev-kit/src/vite/garfish-sub-app.ts`）：

1. **`apply: 'serve'`** — 只在 `vite dev` 时生效，`vite build` 完全跳过
2. **`configResolved`** — 获取 Vite 解析后的配置，定位注册文件路径
3. **`configureServer` → `httpServer.listening`** — 在 HTTP server 端口确定后执行注册
4. **`server.httpServer.address().port`** — 获取 Vite 实际监听的端口（核心！）
5. **原子写入** — `writeFileSync(tmpFile)` + `renameSync(tmpFile, targetFile)`
6. **进程退出清理** — `SIGINT` / `SIGTERM` / `exit` 钩子自动移除注册条目

```
Vite 启动流程:
  configResolved → configureServer → httpServer.listen(port)
                                          │
                                  port 可能被系统改变
                                          │
                                    listening 事件
                                          │
                               address().port = 真实端口
                                          │
                               写入 .dev-registry.json ✅
```

### 5.3 Vite 插件：`devRegistryMiddleware()` —— 主应用端

```ts
// apps/main/vite.config.ts
import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [
    react(),
    devRegistryMiddleware(),  // 暴露 API 端点
  ],
});
```

**核心逻辑**（源码位于 `packages/dev-kit/src/vite/dev-registry-middleware.ts`）：

1. 在 Vite dev server 上注册中间件
2. 拦截 `GET /__dev_registry__` 请求
3. 从文件系统读取 `.dev-registry.json`
4. 返回 JSON 响应（`Cache-Control: no-store` 禁止缓存）

```
浏览器 → GET /__dev_registry__ → Vite middleware → fs.readFile → JSON response
```

### 5.4 DevConfigProvider —— 前端运行时

```ts
// packages/app-registry/src/providers/dev.ts
export class DevConfigProvider implements ConfigProvider {
  async getApps(): Promise<AppManifest[]> {
    const devRegistry = await this.fetchDevRegistry();
    return this.mergeWithDevRegistry(devRegistry);
  }

  watch?(callback: (apps: AppManifest[]) => void): () => void {
    // 每 3 秒轮询 /__dev_registry__
    // 检测到 updatedAt 变化时触发回调
  }
}
```

**合并策略**：

```
静态配置 (registry.ts)           .dev-registry.json
┌──────────────────┐           ┌──────────────────┐
│ feed:             │           │ feed:             │
│   entry: ""       │     +     │   url: :5175      │
│   fallback: :5174 │           │   port: 5175      │
└──────────────────┘           └──────────────────┘
                    ↓ 合并
              ┌──────────────────┐
              │ feed:             │
              │   entry: :5175   │  ← 使用真实地址
              └──────────────────┘

如果 .dev-registry.json 中没有 feed:
              ┌──────────────────┐
              │ feed:             │
              │   entry: :5174   │  ← fallback 到静态配置
              └──────────────────┘
```

### 5.5 Provider 选择策略

```ts
// apps/main/src/lib/registry.ts
function createProvider(): ConfigProvider {
  if (import.meta.env.DEV) {
    return new DevConfigProvider(apps);   // 开发态：动态发现
  }
  return new EnvConfigProvider(apps);     // 生产态：静态配置
}
```

### 5.6 共享文件的读写安全

**多进程并发写入**是共享文件方案的核心挑战。我们的解决方式：

```
进程 A (feed)                    进程 B (article)
     │                                │
     │ 读取文件                        │
     │ 添加 feed 条目                  │ 读取文件
     │ 写入 .tmp.12345               │ 添加 article 条目
     │ rename → .dev-registry.json   │ 写入 .tmp.12346
     │                                │ rename → .dev-registry.json
     │                                │
     ▼                                ▼
```

**原子写入**：先写 `.dev-registry.json.tmp.<pid>`，再 `rename`。rename 是原子操作，不会出现中间状态。

**僵尸进程清理**：每次写入前遍历所有条目，用 `kill(pid, 0)` 检测进程是否存活，不存活的条目自动删除。

```ts
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);  // 不发送信号，仅检测
    return true;
  } catch {
    return false;           // ESRCH: 进程不存在
  }
}
```

---

## 6. 亮点总结

### 6.1 端口自适应 — 真正零配置

社区方案中，端口始终是手动管理的。我们的方案实现了真正的端口自适应：

```
端口 5174 被占用？
  └─→ Vite 自动分配 5175
       └─→ garfishSubApp 插件捕获真实端口
            └─→ 写入 .dev-registry.json
                 └─→ 主应用自动读取到 5175 ✅
```

**开发者完全不需要关心端口号**——启动就能用。

### 6.2 轻量级 — 零基础设施依赖

对比后端的 Consul/Nacos/etcd，我们的方案：

| 维度 | 后端注册中心 | 我们的方案 |
|------|-----------|-----------|
| 额外进程 | 需要启动 Consul/Nacos | 无 |
| 网络依赖 | TCP/HTTP | 文件系统 |
| 安装依赖 | Docker/Java/Go | 纯 Node.js |
| 配置复杂度 | 高 | 一行插件代码 |
| 适用场景 | 生产级 | 开发态 |

### 6.3 渐进式接入

- 不接入 `garfishSubApp` 的子应用 → 主应用 fallback 到静态配置
- 接入后 → 自动享受动态发现能力
- 新增子应用 → 只需在 `vite.config.ts` 加一行

### 6.4 自动清理与容错

| 场景 | 处理方式 |
|------|---------|
| 子应用正常退出 | SIGINT/SIGTERM 钩子清理注册条目 |
| 子应用崩溃 | 下次写入时检测 PID 存活性，自动清理 |
| 启动脚本 | `scripts/dev.sh` 启动前清理整个注册文件 |
| 主应用先于子应用启动 | DevConfigProvider fallback 到静态配置 |
| 子应用后于主应用启动 | watch() 轮询感知新子应用 |

### 6.5 对 Garfish HTML Entry 模式的完美适配

Module Federation 的 Dynamic Remote 方案适合模块级共享，但不适合 Garfish 的 HTML Entry 模式。我们的方案直接操作 entry URL，天然适配 Garfish：

```ts
// AppRegistry → getGarfishApps() → Garfish.run({ apps })
// entry URL 由 DevConfigProvider 动态覆盖
{ name: 'feed', entry: 'http://localhost:5175' }  // 真实地址
```

### 6.6 watch + 热更新

`DevConfigProvider.watch()` 每 3 秒轮询一次 `/__dev_registry__`，当子应用启动/重启时，`AppRegistry` 自动感知并通过 `syncToGarfish()` 同步到 Garfish 运行时。

---

## 7. 难点与解决方案

### 7.1 难点一：如何获取 Vite 的真实端口？

**问题**：Vite 配置中的 `server.port` 只是"期望端口"，当端口被占用且 `strictPort: false` 时，Vite 会自动尝试下一个端口。但 Vite Plugin API 中没有直接获取最终端口的方法。

**解决**：利用底层 Node.js `httpServer` 的 `listening` 事件。

```ts
configureServer(server: ViteDevServer) {
  server.httpServer?.once('listening', () => {
    const address = server.httpServer?.address();
    // address.port 就是真实端口 ✅
  });
}
```

**为什么是 `listening` 事件？**

Vite 的启动流程是：
1. 创建 HTTP server
2. 尝试 `listen(port)`
3. 如果端口被占用，递增重试
4. 成功后触发 `listening` 事件

在 `listening` 事件中，`server.address()` 返回的一定是最终的真实地址。

### 7.2 难点二：多进程并发写入共享文件

**问题**：`pnpm -r --parallel dev` 会同时启动多个子应用进程，它们可能在同一时刻写入 `.dev-registry.json`，导致数据丢失。

**解决**：原子写入 + Read-Modify-Write 模式。

```ts
// 1. 读取当前文件
const registry = readRegistryFile(filePath);

// 2. 修改内存中的数据
registry.apps[entry.name] = entry;

// 3. 原子写入
const tmpFile = `${filePath}.tmp.${process.pid}`;  // 每个进程独立临时文件
fs.writeFileSync(tmpFile, JSON.stringify(registry), 'utf-8');
fs.renameSync(tmpFile, filePath);  // rename 是原子操作
```

**竞争条件分析**：

最坏情况下，进程 A 和 B 同时读取旧文件，各自添加条目后写入。后写入的会覆盖先写入的。但下一次写入时（触发条件：新的子应用启动或清理僵尸进程），丢失的条目会被重新写入。

在开发态场景下（子应用数量有限、启动间隔通常 > 1秒），这种极端竞争几乎不会发生。如果未来需要更强的一致性保证，可以引入 `proper-lockfile` 等文件锁库。

### 7.3 难点三：浏览器端如何读取 Node.js 文件？

**问题**：`DevConfigProvider` 运行在浏览器中，无法直接 `fs.readFile`。

**解决**：通过 Vite dev server 中间件暴露 HTTP API。

```
浏览器端                         Node.js 端
DevConfigProvider                devRegistryMiddleware
     │                                │
     │  fetch('/__dev_registry__')    │
     ├───────────────────────────────→│
     │                                │  fs.readFileSync('.dev-registry.json')
     │  JSON response                 │
     │←───────────────────────────────┤
     │                                │
     ▼                                ▼
合并到 AppManifest[]             读取共享文件
```

这种设计的好处是：
- 浏览器端无需任何特殊能力
- 利用 Vite dev server 本身作为"代理"
- 请求路径 `/__dev_registry__` 以双下划线开头，与业务路由不冲突

### 7.4 难点四：跨包 Vite Plugin 类型不兼容

**问题**：`@luhanxin/dev-kit` 的 `vite` 依赖和各应用的 `vite` 依赖可能是不同版本实例，导致 `Plugin` 类型不兼容：

```
Type 'Plugin' from '@luhanxin/dev-kit/node_modules/vite' is not assignable to
type 'Plugin' from 'apps/feed/node_modules/vite'
```

**解决**：插件函数返回类型声明为 `any`，内部实现仍使用具体类型保证正确性。

```ts
// biome-ignore lint/suspicious/noExplicitAny: 跨包 Plugin 类型兼容
export function garfishSubApp(options: GarfishSubAppOptions): any {
  let config: ResolvedConfig;  // 内部仍使用具体类型
  // ...
}
```

### 7.5 难点五：dev-kit 包的 `.ts` 源文件在 build 时不可用

**问题**：`vite build` 的配置加载阶段不经过 esbuild/SWC 转译，直接 import `.ts` 文件会报错。

**解决**：使用 `tsup` 预编译，package.json 的 `exports` 分离 types 和 import：

```json
{
  "exports": {
    "./vite": {
      "types": "./src/vite/index.ts",   // IDE 类型提示用源文件
      "import": "./dist/vite/index.js"  // 运行时用编译产物
    }
  }
}
```

同时所有插件都设置了 `apply: 'serve'`，在 `vite build` 时完全跳过执行。

---

## 8. 调试命令速查

### 8.1 启动命令

```bash
# 🚀 一键启动所有服务（推荐）
pnpm dev

# 单独启动主应用
pnpm dev:main

# 单独启动 feed 子应用
pnpm dev:feed

# 指定过滤器启动
pnpm --filter @luhanxin/main dev
pnpm --filter @luhanxin/feed dev
```

### 8.2 构建命令

```bash
# 构建所有包
pnpm build

# 单独构建
pnpm build:main
pnpm build:feed

# 构建 dev-kit（修改 dev-kit 源码后必须重新构建）
pnpm --filter @luhanxin/dev-kit build

# dev-kit 监听模式（开发 dev-kit 本身时使用）
pnpm --filter @luhanxin/dev-kit dev
```

### 8.3 调试注册文件

```bash
# 查看当前注册的子应用
cat .dev-registry.json | jq .

# 查看某个子应用的真实端口
cat .dev-registry.json | jq '.apps.feed.resolvedPort'

# 手动清理注册文件
rm -f .dev-registry.json

# 查看子应用进程是否存活
cat .dev-registry.json | jq '.apps[].pid' | xargs -I {} sh -c 'kill -0 {} 2>/dev/null && echo "PID {} alive" || echo "PID {} dead"'
```

### 8.4 调试 API 端点

```bash
# 通过主应用的 dev server 查询注册表（主应用需先启动）
curl -s http://localhost:5173/__dev_registry__ | jq .

# 查看响应头
curl -I http://localhost:5173/__dev_registry__
```

### 8.5 代码质量

```bash
# 类型检查
pnpm typecheck

# 代码 lint
pnpm lint

# 自动修复 lint 问题
pnpm lint:fix

# 格式化
pnpm format
```

### 8.6 测试

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# E2E 测试
pnpm test:e2e

# E2E 交互式调试
pnpm test:e2e:debug
```

### 8.7 Protobuf

```bash
# 生成 Proto 代码
pnpm proto

# Proto lint 检查
pnpm proto:lint
```

### 8.8 清理

```bash
# 清理构建产物
pnpm clean

# 完全清理（包括 node_modules）
pnpm clean:all
```

### 8.9 常见问题排查

**Q: 子应用加载失败？**

```bash
# 1. 检查注册文件是否存在
ls -la .dev-registry.json

# 2. 检查子应用是否注册
cat .dev-registry.json | jq '.apps'

# 3. 检查子应用是否真的在运行
curl -I http://localhost:5174  # 用注册文件中的端口

# 4. 检查 API 端点
curl -s http://localhost:5173/__dev_registry__
```

**Q: 端口显示 preferred 和 resolved 不同？**

这是正常的——说明配置的首选端口被占用，Vite 自动分配了新端口。主应用会使用 resolved 端口。

```bash
# 查看端口映射
cat .dev-registry.json | jq '.apps[] | {name, preferredPort, resolvedPort}'
```

**Q: 修改了 dev-kit 源码后不生效？**

dev-kit 需要编译后才能被其他包使用：

```bash
pnpm --filter @luhanxin/dev-kit build
# 或使用 watch 模式自动编译
pnpm --filter @luhanxin/dev-kit dev
```

---

## 9. 新增子应用接入指南

### 3 步接入

**Step 1**: 安装 dev-kit 开发依赖

```bash
pnpm --filter @luhanxin/<app-name> add -D '@luhanxin/dev-kit@workspace:*'
```

**Step 2**: 在子应用 `vite.config.ts` 中添加插件

```ts
import { garfishSubApp } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [
    // ...其他插件
    garfishSubApp({ name: '<app-name>' }),  // name 必须与 registry.ts 中一致
  ],
  server: {
    port: 51xx,         // 配置一个首选端口
    strictPort: false,  // 允许端口自动递增
    cors: true,
  },
});
```

**Step 3**: 在 `apps/main/src/lib/registry.ts` 中注册

```ts
const apps: AppManifest[] = [
  // ...已有子应用
  {
    name: '<app-name>',
    entry: '',
    activeWhen: '/<app-name>',
    type: 'garfish',
    meta: {
      title: '页面标题',
      icon: 'IconName',
    },
    envEntries: {
      development: 'http://localhost:51xx',  // fallback
      production: '/apps/<app-name>/',
    },
  },
];
```

完成！`pnpm dev` 后子应用会自动注册真实端口。

---

## 10. 未来演进方向

### 10.1 短期优化

| 优化项 | 描述 | 优先级 |
|--------|------|--------|
| **文件锁** | 引入 `proper-lockfile` 解决极端并发写入竞争 | P2 |
| **SSE 推送** | 替代轮询，子应用变更时实时推送给主应用 | P2 |
| **注册超时检测** | 子应用注册后长时间无响应则标记为 unhealthy | P3 |
| **CLI 命令** | `pnpm dev-kit status` 查看所有子应用状态 | P3 |

### 10.2 中期规划

| 方向 | 描述 |
|------|------|
| **生产态集成** | 注册中心从共享文件 → Redis / API，复用同一套 Provider 抽象 |
| **Dashboard** | 子应用健康状态可视化面板 |
| **自动端口分配** | 根据子应用 name 的 hash 自动计算不冲突的首选端口 |
| **与 Module Federation 互通** | 支持 MF 2.0 的 manifest.json 作为注册源 |

### 10.3 长期愿景

构建一个完整的微前端基础设施层：

```
开发态:  共享文件 + Vite Plugin     ←── 当前实现 ✅
测试态:  Docker Compose + 环境变量  ←── EnvConfigProvider ✅
生产态:  API 注册中心               ←── RemoteConfigProvider（待完善）
```

三个环境通过 **ConfigProvider 接口抽象** 统一，上层的 `AppRegistry` + `HealthChecker` + `GarfishAdapter` 完全复用。

---

## 附录

### A. 相关文件清单

| 文件路径 | 描述 |
|----------|------|
| `packages/dev-kit/src/types.ts` | DevRegistryEntry、GarfishSubAppOptions 类型 |
| `packages/dev-kit/src/constants.ts` | DEV_REGISTRY_FILENAME 常量 |
| `packages/dev-kit/src/registry-file.ts` | 共享文件读写工具 |
| `packages/dev-kit/src/vite/garfish-sub-app.ts` | 子应用 Vite 插件 |
| `packages/dev-kit/src/vite/dev-registry-middleware.ts` | 主应用 Vite 中间件 |
| `packages/dev-kit/tsup.config.ts` | 编译配置 |
| `packages/app-registry/src/providers/dev.ts` | DevConfigProvider |
| `packages/app-registry/src/registry.ts` | AppRegistry 核心 |
| `packages/app-registry/src/health/checker.ts` | 健康检查器 |
| `packages/app-registry/src/adapters/garfish.ts` | Garfish 适配器 |
| `apps/main/src/lib/registry.ts` | 主应用注册配置 |
| `apps/feed/vite.config.ts` | feed 子应用 Vite 配置 |
| `apps/main/vite.config.ts` | main 主应用 Vite 配置 |
| `scripts/dev.sh` | 一键启动脚本 |
| `.dev-registry.json` | 运行时共享注册文件（git 忽略） |

### B. 参考资料

- [Garfish 微前端框架](https://garfishjs.org/)
- [Vite Plugin API](https://vite.dev/guide/api-plugin.html)
- [qiankun 微前端](https://qiankun.umijs.org/)
- [single-spa](https://single-spa.js.org/)
- [Module Federation 2.0](https://module-federation.io/)
- [micro-app (京东)](https://micro-zoe.github.io/micro-app/)
- [wujie 无界 (腾讯)](https://wujie-micro.github.io/doc/)
- [Consul Service Discovery](https://www.consul.io/docs/discovery)
- [Nacos 注册中心](https://nacos.io/)
