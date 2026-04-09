## Context

当前搜索使用 Meilisearch 全文搜索 + pg_trgm 模糊搜索。需要升级为语义搜索 + 混合搜索。同时需要建立插件系统，让开发者可以为平台提供增强功能。

## Goals / Non-Goals

**Goals:**

1. Embedding 服务 — 文章发布时自动生成向量
2. 向量存储 — pgvector 或 Qdrant
3. 语义搜索 API — 查询 → Embedding → 向量搜索 → 混合排序
4. 插件 SDK — 开发者创建插件的 API
5. 插件市场 — 浏览/安装/配置

**Non-Goals:**

- AI 对话搜索、代码执行沙箱、付费插件

## Decisions

### Decision 1: 向量存储选型

| 方案 | 优势 | 劣势 |
|------|------|------|
| **pgvector** | 无需新组件，与 PostgreSQL 统一 | 性能不如专用向量库，大规模时有限 |
| Qdrant | 高性能，过滤+向量联合查询 | 新组件，运维成本 |
| Milvus | 企业级，功能全 | 过于重量级 |

选择 **pgvector**：作为 PostgreSQL 扩展，零额外运维成本。社区文章量级（< 100 万）pgvector 完全够用。

```sql
-- pgvector 扩展
CREATE EXTENSION vector;

-- 文章向量表
CREATE TABLE article_embeddings (
  article_id UUID PRIMARY KEY REFERENCES articles(id),
  embedding vector(1536),  -- OpenAI text-embedding-3-small 维度
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW 索引
CREATE INDEX ON article_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### Decision 2: Embedding 模型选型

| 模型 | 维度 | 优势 | 劣势 |
|------|------|------|------|
| OpenAI text-embedding-3-small | 1536 | 质量高，无需自部署 | API 调用成本 |
| BGE-large-zh (本地) | 1024 | 免费，中文优化 | 需要部署 GPU 服务 |
| Cohere embed-v3 | 1024 | 多语言 | API 调用成本 |

建议：**开发环境用 OpenAI，生产环境按需选择**。

### Decision 3: 混合搜索策略

```
用户查询
    ↓
┌──────────────────┐
│ 生成查询 Embedding │
└────┬─────────────┘
     ↓
┌────────────┐  ┌──────────────┐  ┌────────────┐
│ 向量搜索   │  │ 全文搜索     │  │ 标签搜索   │
│ pgvector   │  │ Meilisearch  │  │ PostgreSQL │
│ Cosine Top20│  │ BM25 Top20   │  │ Tags Match│
└────┬───────┘  └────┬─────────┘  └────┬───────┘
     ↓              ↓                  ↓
┌─────────────────────────────────────┐
│      RRF (Reciprocal Rank Fusion)    │
│   Score = Σ 1/(k + rank_i)          │
└─────────────────┬───────────────────┘
                  ↓
            最终排序结果
```

k=60（RRF 常用参数），权重可通过配置调整。

### Decision 4: 插件 SDK 设计

**插件分类**：

| 类型 | 运行环境 | 安全模型 | 示例 |
|------|---------|---------|------|
| **前端插件** | 浏览器 iframe 沙箱 | iframe + postMessage 通信 | 代码运行、图表渲染 |
| **后端插件** | 服务端 WASM/dynamic library | 容器隔离 + 权限控制 | AI 增强、数据处理 |

#### 4.1 前端插件架构

```typescript
// packages/plugin-sdk/src/index.ts
import { definePlugin, useArticleRender, useSearchEnhance } from '@luhanxin/plugin-sdk';

export default definePlugin({
  name: 'code-runner',
  version: '1.0.0',
  description: '文章中的代码块可在线运行',
  
  // Extension Points
  extensions: {
    // 文章渲染增强：为代码块添加「运行」按钮
    articleRender: {
      codeBlock: {
        afterRender(codeBlock, container) {
          const button = document.createElement('button');
          button.textContent = '▶ 运行';
          container.appendChild(button);
        }
      }
    }
  }
});
```

**iframe 沙箱隔离**：

```typescript
// 前端插件运行在 iframe 中，通过 postMessage 与宿主通信
const pluginIframe = document.createElement('iframe');
pluginIframe.sandbox = 'allow-scripts allow-same-origin'; // 限制权限
pluginIframe.src = pluginUrl;

// 插件 → 宿主通信
window.parent.postMessage({
  type: 'plugin:request',
  method: 'fetchArticle',
  params: { id: '...' }
}, '*');

// 宿主 → 插件通信
pluginIframe.contentWindow.postMessage({
  type: 'plugin:response',
  result: { title: '...' }
}, '*');
```

**权限模型**：

```typescript
interface PluginPermissions {
  network?: boolean;      // 是否允许网络请求
  storage?: boolean;      // 是否允许 localStorage
  clipboard?: boolean;    // 是否允许剪贴板
  notifications?: boolean; // 是否允许通知
}

// 用户安装插件时需要授权
const plugin = await installPlugin(manifest, {
  permissions: ['network', 'storage']
});
```

#### 4.2 后端插件架构

**WASM 插件**（推荐）：

```rust
// 后端插件编译为 WASM，在沙箱中执行
use wasmtime::*;

pub struct PluginRuntime {
    engine: Engine,
    module: Module,
}

impl PluginRuntime {
    pub fn execute(&self, input: &[u8]) -> Result<Vec<u8>> {
        let mut store = Store::new(&self.engine, ());
        let instance = Instance::new(&mut store, &self.module, &[])?;
        
        let process = instance.get_typed_func::<(i32, i32), i32>(&mut store, "process")?;
        let result = process.call(&mut store, (input.as_ptr() as i32, input.len() as i32))?;
        
        // 从 WASM 内存读取结果
        Ok(read_wasm_memory(&instance, result))
    }
}
```

**Dynamic Library 插件**（高级）：

```rust
// 编译为 .so/.dylib，动态加载（需严格权限控制）
use libloading::*;

pub unsafe fn load_plugin(path: &str) -> Result<Plugin> {
    let lib = Library::new(path)?;
    let process = lib.get::<fn(&[u8]) -> Vec<u8>>(b"process")?;
    Ok(Plugin { lib, process })
}
```

**安全隔离**：

| 层级 | 隔离措施 |
|------|---------|
| **进程级** | 插件运行在独立容器中 |
| **网络级** | 插件容器仅允许访问特定服务 |
| **权限级** | 插件需声明所需权限，管理员审批 |
| **资源级** | 限制 CPU/内存使用量 |

### Decision 5: 插件版本兼容性

**版本号规范**：`major.minor.patch`（SemVer）

**兼容性检查**：

```rust
pub fn check_compatibility(plugin_version: &str, platform_version: &str) -> bool {
    let plugin = Version::parse(plugin_version)?;
    let platform = Version::parse(platform_version)?;
    
    // Major 版本必须匹配
    plugin.major == platform.major && plugin.minor <= platform.minor
}
```

**插件更新策略**：

| 场景 | 策略 |
|------|------|
| **Patch 更新** | 自动更新 |
| **Minor 更新** | 提示用户更新 |
| **Major 更新** | 需要用户手动确认 |

### Decision 6: pgvector 性能优化

**问题**：pgvector 在文章量超过 10 万时性能下降。

**优化策略**：

| 优化项 | 说明 |
|--------|------|
| **HNSW 索引** | 使用 HNSW 索引，比 IVFFlat 更快 |
| **分区表** | 按时间分区，减少单表数据量 |
| **预热缓存** | 启动时加载热点文章向量到内存 |
| **降级方案** | 向量搜索超时时降级为全文搜索 |

```sql
-- 分区表示例
CREATE TABLE article_embeddings (
  article_id UUID NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (article_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE article_embeddings_2026_q1 PARTITION OF article_embeddings
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

**性能基准**：

| 文章量 | 查询延迟（P95） |
|--------|----------------|
| 1 万 | < 50ms |
| 10 万 | < 100ms |
| 100 万 | < 500ms |

**超过 100 万文章时**：考虑迁移到 Qdrant 或 Milvus。
          button.onclick = () => executeCode(codeBlock.code);
          container.appendChild(button);
        }
      }
    },
    
    // 搜索增强：添加额外的搜索结果
    searchEnhance: {
      async search(query) {
        return fetch(`https://my-api.com/search?q=${query}`).then(r => r.json());
      }
    }
  }
});
```

### Decision 5: 插件市场 API

```protobuf
// proto/luhanxin/community/v1/plugin.proto
service PluginService {
  rpc ListPlugins(ListPluginsRequest) returns (ListPluginsResponse);
  rpc GetPlugin(GetPluginRequest) returns (Plugin);
  rpc InstallPlugin(InstallPluginRequest) returns (InstallPluginResponse);
  rpc UninstallPlugin(UninstallPluginRequest) returns (UninstallPluginResponse);
}

message Plugin {
  string id = 1;
  string name = 2;
  string version = 3;
  string description = 4;
  string author_id = 5;
  repeated string permissions = 6;  // article.render | search.enhance | editor.extend
  string entry_url = 7;  // 插件入口 URL
  string icon_url = 8;
  int32 install_count = 9;
  float rating = 10;
}
```

### Decision 6: 插件沙箱

前端插件在 iframe 沙箱中运行，通过 `postMessage` 与宿主通信：

```html
<iframe
  src={plugin.entryUrl}
  sandbox="allow-scripts"
  style="display: none"
/>
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Embedding 成本 | 每篇文章一次 API 调用 | 缓存 + 增量更新（仅内容变更时重新生成） |
| pgvector 性能 | 大规模时查询变慢 | HNSW 索引 + 定期 VACUUM |
| 插件安全 | 恶意插件可能窃取数据 | iframe 沙箱 + 权限控制 + 审核 |
| 混合搜索复杂度 | 三个搜索源的协调 | RRF 算法简单有效 |

## Open Questions（已解决）

1. **Embedding 维度选择？**
   - ✅ 选择：**1024**
   - 理由：平衡性能和精度，BGE-M3 默认维度，开源模型标准
   - 实现：使用 `sentence-transformers` + BGE-M3 模型（开源免费）

2. **是否需要支持本地 Embedding 模型？**
   - ✅ 选择：**支持（必须，开源免费方案）**
   - 理由：零成本，无 API 依赖，数据隐私
   - 实现方案：
     ```bash
     # 安装 sentence-transformers
     pip install sentence-transformers
     
     # 下载 BGE-M3 模型（北京智源人工智能研究院开源）
     # 支持多语言，中文效果好，1024 维度
     ```
   - 代码示例：
     ```python
     from sentence_transformers import SentenceTransformer
     
     # 加载模型
     model = SentenceTransformer('BAAI/bge-m3')
     
     # 生成 embedding
     embeddings = model.encode(['文章内容1', '文章内容2'])
     ```
   - 性能：
     - CPU 推理：~50ms/文本
     - GPU 推理：~5ms/文本
   - 成本：**零成本**（无需 GPU 也可运行，CPU 性能足够）

3. **插件是否需要审核机制？**
   - ✅ 选择：**需要（安全审核 + 质量审核）**
   - 理由：保护用户安全，维护生态健康
   - 流程：开发者提交 → 自动安全扫描 → 人工审核 → 上架

4. **插件是否支持后端 Extension？**
   - ✅ 已在 Decision 4 中解决
   - 支持前端插件（iframe 沙箱）和后端插件（WASM/dynamic library）

5. **插件市场是否需要评分/评论系统？**
   - ✅ 选择：**需要**
   - 理由：生态健康，用户决策参考，激励优质插件
   - 实现：星级评分 + 文字评论 + 下载量统计
