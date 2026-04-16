# GIPHY REST API vs SDK 集成指南 — 原理、选型与工程化落地

> 📅 创建日期：2026-04-06
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · GIPHY · GIF · 第三方集成 · 前端SDK

---

## 1. 核心原理与调度机制

### 1.1 GIPHY REST API 调度原理（服务端调度）

```
┌─────────────┐    HTTPS     ┌──────────────────┐    内部     ┌─────────────┐
│  你的服务端   │ ──────────→ │ api.giphy.com     │ ────────→ │  GIPHY CDN  │
│  (Rust/Go)  │ ←────────── │ (REST Gateway)    │ ←──────── │  (图片分发)  │
└─────────────┘   JSON 响应   └──────────────────┘           └─────────────┘
```

**调度链路**：
1. **你的服务端**发起 HTTPS 请求到 `api.giphy.com`
2. GIPHY Gateway 根据 `api_key` 参数鉴权 → 检查 App 类型必须为 **API**
3. 查询内部搜索引擎/推荐系统，返回 GIF Object 数组
4. 图片 URL 指向 GIPHY CDN（`media.giphy.com` / `i.giphy.com`）
5. **无 pingback 追踪** — 不上报用户行为数据，GIPHY 无法统计使用情况

**关键特征**：
- 鉴权方式：URL 参数 `api_key=xxx`
- 请求来源：服务端（IP 可控、可隐藏 Key）
- 无 SDK 运行时开销（无 pingback、无内存缓存池）
- 适合：后端代理、服务端渲染、数据预处理

### 1.2 GIPHY SDK 调度原理（客户端调度）

```
┌─────────────┐                    ┌──────────────────┐
│  浏览器客户端  │                    │ api.giphy.com     │
│             │ ── fetch() ──────→ │ (SDK Gateway)     │
│  GiphyFetch │ ←── JSON ──────── │  鉴权: SDK Key    │
│  + Grid     │                    └──────────────────┘
│             │ ── pingback ─────→ ┌──────────────────┐
│             │                    │ pingback.giphy.com│
│             │                    │  (行为追踪)       │
└─────────────┘                    └──────────────────┘
       │
       │ <img src="...">
       ▼
┌─────────────┐
│ GIPHY CDN   │
│ media.giphy │
└─────────────┘
```

**SDK 内部调度流程**（`@giphy/js-fetch-api` 源码分析）：

```typescript
// 1. GiphyFetch 构造 — 绑定 apiKey + 自动生成 pingbackId
class GiphyFetch {
  constructor(apiKey: string, qsParams = {}) {
    this.apiKey = apiKey;           // SDK Key
    this.qsParams = qsParams;       // 额外查询参数
  }

  // 2. 所有方法最终调用内部 request()
  trending(options = {}) {
    return request(`${getType(options)}/trending?${this.getQS({ rating: 'pg-13', ...options })}`, {
      normalizer: normalizeGifs,     // 3. 响应数据标准化
    });
  }
}

// 4. request() 内部实现 — 含内存缓存 + 去重
function request(url, options = {}) {
  const { apiVersion = 1, noCache = false } = options;
  const serverUrl_ = serverUrl.replace(/\/v\d+\/$/, `/v${apiVersion}/`);

  purgeCache();  // 5. 清理过期缓存（正常 60s，错误 6s）

  if (!requestMap[url] || noCache) {
    const fullUrl = `${serverUrl_}${url}`;
    requestMap[url] = {
      request: fetch(fullUrl, { method: 'get' }).then(/* ... */),
      ts: Date.now(),
    };
  }
  return requestMap[url].request;  // 6. 相同 URL 在缓存期内复用 Promise
}
```

**SDK 独有能力**：
- **Pingback 追踪**：每个请求自动携带 `pingback_id`，上报到 `pingback.giphy.com`
- **内存级请求去重**：相同 URL 在 60s 内复用 Promise，不重复发起网络请求
- **错误快速重试**：错误缓存仅 6s，之后自动允许重新请求
- **GIF Object 标准化**：`normalizeGif()` 统一各 API 版本返回格式
- **React 组件集成**：`@giphy/react-components` 提供 Grid/Carousel/Gif 等组件

### 1.3 KEY 权限体系差异

| 维度 | API Key | SDK Key |
|------|---------|---------|
| **App 类型** | 创建时选择 `API` | 创建时选择 `SDK` |
| **鉴权层** | REST Gateway 鉴权 | SDK Gateway 鉴权（独立层） |
| **Pingback** | ❌ 不追踪 | ✅ 自动追踪（SDK 内置 `pingback_id`） |
| **GIPHY 合规要求** | 宽松（服务端无法展示 attribution） | 严格（要求展示 "Powered by GIPHY"） |
| **适用场景** | 后端代理、数据分析、服务端渲染 | 前端 SDK（`@giphy/js-fetch-api`） |
| **限流** | Beta: 100 calls/hour | Beta: 100 calls/hour |
| **能否互换** | ❌ 不能用于 SDK | ❌ 不能直接调 REST API |

**为什么不能混用？**

GIPHY 后端有两套独立的 Gateway：

```
api.giphy.com
  ├── REST Gateway  ← 校验 api_key 是否为 API 类型 App
  │     └── 无 pingback 链路
  └── SDK Gateway   ← 校验 api_key 是否为 SDK 类型 App
        └── 关联 pingback 链路（要求 pingback_id 参数）
```

SDK Key 发到 REST Gateway → **鉴权失败**（Key 类型不匹配）
API Key 发到 SDK Gateway → **鉴权失败**（缺少 pingback 链路注册）

这是 GIPHY 的商业策略：SDK 路径提供免费使用 + 行为数据回收（GIPHY 通过 pingback 数据变现）；API 路径面向企业用户（付费去广告、自定义水印）。

### 1.4 本质区别对比表

| 维度 | REST API | SDK |
|------|----------|-----|
| **调用方** | 服务端 | 浏览器客户端 |
| **Key 类型** | API Key | SDK Key |
| **传输协议** | HTTPS + JSON | HTTPS + JSON（SDK 封装 fetch） |
| **缓存** | 需自己实现（Redis/CDN） | SDK 内置内存缓存（60s TTL） |
| **请求去重** | 需自己实现 | 内置（相同 URL 复用 Promise） |
| **行为追踪** | 无 | 自动 pingback |
| **React 组件** | 无（需自己实现 Grid） | `@giphy/react-components`（Grid/Carousel） |
| **Key 暴露风险** | 低（服务端隐藏） | 中（浏览器可见，但 GIPHY 允许） |
| **GIPHY ToS 合规** | 需自行实现 attribution | SDK 组件内置 attribution |
| **API 版本** | v1（GIF/Sticker）、v2（Emoji） | SDK 自动处理版本切换 |

---

## 2. REST API 完整调用案例

### 2.1 核心接口

| 接口 | URL | 说明 |
|------|-----|------|
| **Trending** | `GET /v1/gifs/trending` | 热门 GIF |
| **Search** | `GET /v1/gifs/search?q=xxx` | 搜索 GIF |
| **Sticker Trending** | `GET /v1/stickers/trending` | 热门 Sticker |
| **Sticker Search** | `GET /v1/stickers/search?q=xxx` | 搜索 Sticker |
| **Random** | `GET /v1/gifs/random` | 随机 GIF |
| **GIF by ID** | `GET /v1/gifs/{gif_id}` | 按 ID 获取 |
| **Emoji** | `GET /v2/emoji` | GIPHY 动画 Emoji（v2） |
| **Emoji Variations** | `GET /v2/emoji/{gif_id}/variations` | Emoji 变体 |

**通用参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `api_key` | string | — | **必填**，API 类型 App 的 Key |
| `limit` | int | 25 | 返回数量（最大 50） |
| `offset` | int | 0 | 偏移量（最大 499） |
| `rating` | string | 全部 | 内容分级：`g` / `pg` / `pg-13` / `r` |
| `lang` | string | en | 搜索语言（`zh-CN` 支持中文） |
| `random_id` | string | — | 用户代理 ID（个性化推荐） |
| `bundle` | string | — | 渲染包（`messaging_non_clips` 等，减少响应体积） |

**状态码**：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | Key 无效或类型不匹配 |
| 403 | Key 被封禁 |
| 414 | URI 太长 |
| 429 | 超出限流（Beta: 100/hour） |

### 2.2 前端直调案例（React，适用于 API Key 场景）

> ⚠️ 前端直调会暴露 API Key，仅适用于开发调试。生产环境应走后端代理。

```tsx
// hooks/useGiphySearch.ts — 通用 GIPHY REST API Hook
import { useState, useCallback, useRef, useEffect } from 'react';

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
    fixed_width_small: { url: string };
  };
}

interface GiphyResponse {
  data: GiphyGif[];
  pagination: { total_count: number; count: number; offset: number };
}

const API_BASE = 'https://api.giphy.com/v1';
const API_KEY = 'YOUR_API_KEY'; // ⚠️ 生产环境走后端代理

export function useGiphySearch(type: 'gifs' | 'stickers' = 'gifs') {
  const [results, setResults] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const cacheRef = useRef<Map<string, GiphyResponse>>(new Map());

  const fetchGifs = useCallback(async (query: string, offset = 0) => {
    const cacheKey = `${type}:${query}:${offset}`;
    if (cacheRef.current.has(cacheKey)) {
      setResults(prev => offset === 0
        ? cacheRef.current.get(cacheKey)!.data
        : [...prev, ...cacheRef.current.get(cacheKey)!.data]
      );
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = query
      ? `${API_BASE}/${type}/search`
      : `${API_BASE}/${type}/trending`;

    const params = new URLSearchParams({
      api_key: API_KEY,
      limit: '20',
      offset: String(offset),
      rating: 'pg-13',
      ...(query ? { q: query, lang: 'zh-CN' } : {}),
    });

    try {
      const resp = await fetch(`${endpoint}?${params}`);
      if (!resp.ok) {
        if (resp.status === 429) throw new Error('请求过于频繁，请稍后再试');
        if (resp.status === 401) throw new Error('GIPHY API Key 无效');
        throw new Error(`GIPHY API error: ${resp.status}`);
      }
      const data: GiphyResponse = await resp.json();
      cacheRef.current.set(cacheKey, data);
      setResults(prev => offset === 0 ? data.data : [...prev, ...data.data]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  // 防抖搜索
  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(query), 300);
  }, [fetchGifs]);

  return { results, loading, error, search, fetchGifs };
}
```

### 2.3 后端代理案例（Rust / Axum）

```rust
// services/gateway/src/routes/giphy/mod.rs
use axum::{
    extract::Query,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// GIPHY API Key（API 类型，服务端专用）
const GIPHY_API_KEY: &str = "Th5lx1fSHl4KoJKrAOqjzhps4mSsNIbU";
const GIPHY_BASE: &str = "https://api.giphy.com/v1";

#[derive(Deserialize)]
pub struct GiphySearchQuery {
    pub q: Option<String>,
    pub r#type: Option<String>,  // "gifs" | "stickers"
    pub offset: Option<u32>,
    pub limit: Option<u32>,
}

/// 简单的内存缓存（TTL = 5min）
struct CacheEntry {
    data: serde_json::Value,
    expires_at: Instant,
}

type GiphyCache = Arc<RwLock<HashMap<String, CacheEntry>>>;

pub fn giphy_routes() -> Router {
    let cache: GiphyCache = Arc::new(RwLock::new(HashMap::new()));

    Router::new()
        .route("/api/v1/giphy/search", get({
            let cache = cache.clone();
            move |query| giphy_search(query, cache)
        }))
        .route("/api/v1/giphy/trending", get({
            let cache = cache.clone();
            move |query| giphy_trending(query, cache)
        }))
}

async fn giphy_search(
    Query(params): Query<GiphySearchQuery>,
    cache: GiphyCache,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let media_type = params.r#type.as_deref().unwrap_or("gifs");
    let q = params.q.as_deref().unwrap_or("");
    let offset = params.offset.unwrap_or(0);
    let limit = params.limit.unwrap_or(20).min(50);

    let cache_key = format!("search:{}:{}:{}", media_type, q, offset);

    // 检查缓存
    {
        let cache_read = cache.read().await;
        if let Some(entry) = cache_read.get(&cache_key) {
            if entry.expires_at > Instant::now() {
                return Ok(Json(entry.data.clone()));
            }
        }
    }

    let url = format!(
        "{}/{}/search?api_key={}&q={}&limit={}&offset={}&rating=pg-13&lang=zh-CN",
        GIPHY_BASE, media_type, GIPHY_API_KEY, q, limit, offset
    );

    let resp = reqwest::get(&url).await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    let data: serde_json::Value = resp.json().await.map_err(|_| StatusCode::BAD_GATEWAY)?;

    // 写入缓存（5 分钟 TTL）
    {
        let mut cache_write = cache.write().await;
        cache_write.insert(cache_key, CacheEntry {
            data: data.clone(),
            expires_at: Instant::now() + Duration::from_secs(300),
        });
    }

    Ok(Json(data))
}

async fn giphy_trending(
    Query(params): Query<GiphySearchQuery>,
    cache: GiphyCache,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let media_type = params.r#type.as_deref().unwrap_or("gifs");
    let offset = params.offset.unwrap_or(0);
    let limit = params.limit.unwrap_or(20).min(50);

    let cache_key = format!("trending:{}:{}", media_type, offset);

    {
        let cache_read = cache.read().await;
        if let Some(entry) = cache_read.get(&cache_key) {
            if entry.expires_at > Instant::now() {
                return Ok(Json(entry.data.clone()));
            }
        }
    }

    let url = format!(
        "{}/{}/trending?api_key={}&limit={}&offset={}&rating=pg-13",
        GIPHY_BASE, media_type, GIPHY_API_KEY, limit, offset
    );

    let resp = reqwest::get(&url).await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    let data: serde_json::Value = resp.json().await.map_err(|_| StatusCode::BAD_GATEWAY)?;

    {
        let mut cache_write = cache.write().await;
        cache_write.insert(cache_key, CacheEntry {
            data: data.clone(),
            expires_at: Instant::now() + Duration::from_secs(300),
        });
    }

    Ok(Json(data))
}
```

---

## 3. SDK 完整调用案例

### 3.1 核心依赖

```bash
# @giphy/js-fetch-api — API 请求封装（GiphyFetch 类）
# @giphy/react-components — React 组件（Grid, Carousel, Gif）
# @giphy/js-types — TypeScript 类型定义
pnpm add @giphy/js-fetch-api @giphy/react-components @giphy/js-types
```

**SDK 内部依赖关系**：

```
@giphy/react-components
  └── @giphy/js-fetch-api (peer)
        ├── @giphy/js-types (类型)
        └── @giphy/js-util  (pingback ID 生成)
```

### 3.2 初始化（SDK Key 专用）

```typescript
// src/lib/giphy.ts
import { GiphyFetch } from '@giphy/js-fetch-api';

// ⚠️ 必须是 SDK 类型 App 的 Key，API Key 不可用
const sdkKey = import.meta.env.VITE_GIPHY_SDK_KEY as string;

export const gf = new GiphyFetch(sdkKey);
export const isGiphyAvailable = Boolean(sdkKey);
```

### 3.3 React GIF 选择器完整案例

```tsx
// components/ExpressionPicker/GiphyGrid.tsx
import { Grid } from '@giphy/react-components';
import type { IGif } from '@giphy/js-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gf, isGiphyAvailable } from '@/lib/giphy';

interface GiphyGridProps {
  type: 'gifs' | 'stickers';
  onSelect: (gif: IGif) => void;
}

export default function GiphyGrid({ type, onSelect }: GiphyGridProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 防抖搜索
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // SDK fetchGifs 回调 — Grid 组件会自动管理分页
  const fetchGifs = useCallback(
    (offset: number) => {
      if (debouncedQuery) {
        return gf.search(debouncedQuery, {
          offset, limit: 20, type, lang: 'zh-CN',
        });
      }
      return gf.trending({ offset, limit: 20, type });
    },
    [debouncedQuery, type],
  );

  const handleGifClick = useCallback(
    (gif: IGif, e: React.SyntheticEvent) => {
      e.preventDefault();
      onSelect(gif);
    },
    [onSelect],
  );

  if (!isGiphyAvailable) {
    return <div>GIPHY SDK Key 未配置</div>;
  }

  return (
    <div>
      <input
        type="text"
        placeholder={type === 'gifs' ? '搜索 GIF...' : '搜索 Sticker...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Grid
        key={`${type}-${debouncedQuery}`}  // key 变化触发重新加载
        width={308}
        columns={2}
        gutter={6}
        fetchGifs={fetchGifs}
        onGifClick={handleGifClick}
        noLink            // 禁止点击跳转 GIPHY
        hideAttribution   // 隐藏单个 GIF 的 attribution（仍需全局展示）
      />
      <div>Powered by GIPHY</div>  {/* GIPHY ToS 合规要求 */}
    </div>
  );
}
```

### 3.4 SDK Grid 组件内部调度原理

```
┌─────────── Grid 组件 ───────────┐
│                                  │
│  1. 首次渲染 → fetchGifs(0)      │
│  2. 滚动到底 → fetchGifs(offset) │  ← 自动无限滚动
│  3. key 变化 → 重置 + fetchGifs(0)│  ← 搜索词变化
│                                  │
│  内部状态:                        │
│  - gifs: IGif[]                  │
│  - isFetching: boolean           │
│  - isDoneFetching: boolean       │
│                                  │
│  渲染: CSS Grid / Masonry Layout │
│  + <img src={gif.images.xxx.url}>│
│  + Intersection Observer (懒加载) │
└──────────────────────────────────┘
         │
         ▼ fetchGifs(offset)
┌─────────── GiphyFetch ──────────┐
│  gf.trending({ offset, limit }) │
│    → request('gifs/trending?...') │
│      → requestMap 缓存检查       │
│        → 命中: 复用 Promise      │
│        → 未命中: fetch() 发请求   │
│      → normalizeGifs() 标准化    │
│    → 返回 { data, pagination }   │
└──────────────────────────────────┘
```

### 3.5 Vue 适配方案（无官方 SDK 组件）

GIPHY 官方只有 `@giphy/react-components`，Vue 需要自行封装：

```vue
<!-- components/GiphyGrid.vue — Vue 3 适配 -->
<script setup lang="ts">
import { GiphyFetch } from '@giphy/js-fetch-api';
import type { IGif } from '@giphy/js-types';
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  type: 'gifs' | 'stickers';
  sdkKey: string;
}>();

const emit = defineEmits<{
  select: [gif: IGif];
}>();

const gf = new GiphyFetch(props.sdkKey);
const gifs = ref<IGif[]>([]);
const query = ref('');
const offset = ref(0);
const loading = ref(false);
const hasMore = ref(true);

let debounceTimer: ReturnType<typeof setTimeout>;

async function fetchGifs(reset = false) {
  if (loading.value || (!hasMore.value && !reset)) return;
  if (reset) { offset.value = 0; gifs.value = []; hasMore.value = true; }

  loading.value = true;
  try {
    const result = query.value
      ? await gf.search(query.value, { offset: offset.value, limit: 20, type: props.type, lang: 'zh-CN' })
      : await gf.trending({ offset: offset.value, limit: 20, type: props.type });

    gifs.value = reset ? result.data : [...gifs.value, ...result.data];
    offset.value += result.data.length;
    hasMore.value = result.data.length === 20;
  } catch (e) {
    console.error('[GIPHY]', e);
  } finally {
    loading.value = false;
  }
}

watch(query, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchGifs(true), 300);
});

// 无限滚动
const sentinel = ref<HTMLElement>();
let observer: IntersectionObserver;

onMounted(() => {
  fetchGifs(true);
  observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) fetchGifs(); },
    { rootMargin: '200px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div class="giphy-grid">
    <input v-model="query" :placeholder="type === 'gifs' ? '搜索 GIF...' : '搜索 Sticker...'" />
    <div class="grid">
      <img
        v-for="gif in gifs"
        :key="gif.id"
        :src="gif.images.fixed_height.url"
        :alt="gif.title"
        @click="emit('select', gif)"
      />
    </div>
    <div ref="sentinel" />
    <div class="attribution">Powered by GIPHY</div>
  </div>
</template>
```

---

## 4. 社区平台选型与最佳实践

### 4.1 选型决策

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| **评论区 GIF 选择器** | ✅ SDK（当前方案） | React 生态、组件完善、免费、Grid 内置懒加载 |
| **编辑器 GIF 插入** | ✅ SDK | 同上，ExpressionPicker 可复用 |
| **后端 GIF 预览/缓存** | API Key + Rust 代理 | 隐藏 Key、服务端缓存、限流控制 |
| **Vue 管理后台** | API Key + 后端代理 | 无官方 Vue SDK，REST API 更通用 |
| **SSR 预渲染** | API Key + 后端调用 | SDK 依赖浏览器环境 |

### 4.2 当前架构（luhanxin-community）

```
┌──────────── 前端（React）────────────┐
│                                       │
│  ExpressionPicker                     │
│    ├── Emoji Tab (本地 emoji 数据)     │
│    ├── GIF Tab → GiphyGrid            │
│    │     └── gf.search() / gf.trending()  ← SDK Key
│    └── Sticker Tab → GiphyGrid        │
│          └── gf.trending({ type: 'stickers' })
│                                       │
│  用户选择 GIF → MediaAttachment proto │
│    → createComment({ mediaAttachments }) │
│      → Gateway REST → svc-content gRPC │
│        → PostgreSQL JSONB              │
└───────────────────────────────────────┘

┌──────────── 后端（Rust）─────────────┐
│                                       │
│  comments.media_attachments (JSONB)   │
│    → 存储 GIF URL + metadata          │
│    → 不代理 GIPHY 图片（直接用 CDN） │
│                                       │
│  预留：/api/v1/giphy/* (API Key 代理) │
│    → 用于 Vue 管理后台                │
│    → 用于服务端 GIF 预处理            │
└───────────────────────────────────────┘
```

### 4.3 性能优化要点

| 优化项 | 实现方式 |
|--------|---------|
| **搜索防抖** | 300ms debounce（GiphyGrid 已实现） |
| **SDK 内存缓存** | SDK 内置 60s requestMap 去重 |
| **图片懒加载** | Grid 组件内置 IntersectionObserver |
| **渲染包优化** | 可传入 `bundle: 'messaging_non_clips'` 减少响应体积 |
| **CDN 加速** | GIF 图片 URL 指向 `media.giphy.com`（GIPHY CDN） |
| **预览图** | 使用 `images.fixed_height` 而非 `original`（节省带宽） |
| **Grid key 重置** | 搜索词变化时 `key={type}-${query}` 触发组件重建 |

### 4.4 安全合规

| 要点 | 措施 |
|------|------|
| **SDK Key 暴露** | 浏览器可见但 GIPHY 允许（SDK Key 仅限 SDK 调用，无法调 REST API） |
| **API Key 保护** | 仅存在后端环境变量中，不暴露给前端 |
| **GIPHY ToS** | 展示 "Powered by GIPHY" attribution（ExpressionPicker 底部已添加） |
| **内容分级** | 使用 `rating: 'pg-13'` 过滤不适当内容 |
| **限流应对** | Beta 100 calls/hour，生产环境升级 Production Key |

### 4.5 KEY 管理规范

```bash
# .env.local（前端，不入 Git）
VITE_GIPHY_SDK_KEY=xxx          # SDK Key — 用于 @giphy/js-fetch-api

# docker/.env 或 services/.env（后端，不入 Git）
GIPHY_API_KEY=xxx               # API Key — 用于后端 REST 代理

# .env.example（入 Git，模板）
VITE_GIPHY_SDK_KEY=your_sdk_key_here
GIPHY_API_KEY=your_api_key_here
```

---

## 5. 参考资料

| 资源 | URL |
|------|-----|
| GIPHY API 文档 | https://developers.giphy.com/docs/api/ |
| GIPHY API Explorer | https://developers.giphy.com/explorer/ |
| Trending Endpoint | https://developers.giphy.com/docs/api/endpoint/#trending |
| Search Endpoint | https://developers.giphy.com/docs/api/endpoint/#search |
| Emoji Endpoint | https://developers.giphy.com/docs/api/endpoint/#emoji |
| GIF Object Schema | https://developers.giphy.com/docs/api/schema/#gif-object |
| @giphy/js-fetch-api | https://github.com/Giphy/giphy-js/tree/master/packages/fetch-api |
| @giphy/react-components | https://github.com/Giphy/giphy-js/tree/master/packages/react-components |
| SDK Key vs API Key | https://developers.giphy.com/docs/api/#quick-start-guide |

---

## 6. ADR 决策记录

| 维度 | 决策 |
|------|------|
| **前端 GIF 功能** | SDK（`@giphy/js-fetch-api` + `@giphy/react-components`） |
| **Key 类型** | SDK Key（前端）+ API Key（后端预留） |
| **不做后端代理** | 当前阶段 SDK 直连 GIPHY CDN 即可，省去代理复杂度 |
| **Vue 管理后台** | 后续如需 GIF 功能，走后端 API Key 代理 |
| **升级路径** | Beta → Production Key（去除 100/hour 限制） |
