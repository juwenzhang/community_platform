## Context

当前 `articles` 表结构定义于 `services/shared/src/entity/articles.rs`，`content` 字段为 TEXT 类型，直接存储原始 Markdown 字符串。

Proto 定义在 `proto/luhanxin/community/v1/article.proto`，当前 `GetArticleResponse` 只返回 `Article article`。

## Goals / Non-Goals

**Goals:**

1. 文章内容压缩存储 — zstd 透明压缩/解压，节省 60%-80% 存储空间
2. AST/TOC 结构化存储 — JSONB 存储解析后的 TOC、纯文本、字数统计、阅读时间
3. 前后端 Proto 对齐 — 新增 `ArticleAst` message
4. 透明压缩/解压 — 对 handler 层透明

**Non-Goals:**

- 不做前端变更
- 不引入新基础设施

## Decisions

### Decision 1: 压缩算法 — zstd

| 算法 | 压缩比 | 解压速度 | 压缩速度 |
|------|--------|---------|---------|
| **zstd** | 高（3-5x） | 极快 | 快 |
| gzip | 中（2-3x） | 快 | 中 |
| lz4 | 低（2x） | 极快 | 极快 |

选择 zstd：对 Markdown 文本压缩比最优，解压速度接近 lz4。

```rust
use zstd::encode_all;
use zstd::decode_all;

fn compress_content(content: &str) -> Result<Vec<u8>, CompressionError> {
    encode_all(content.as_bytes(), 3).map_err(CompressionError::from)
}

fn decompress_content(compressed: &[u8]) -> Result<String, CompressionError> {
    decode_all(compressed)
        .map_err(CompressionError::from)
        .and_then(|bytes| String::from_utf8(bytes).map_err(CompressionError::from))
}
```

### Decision 2: 存储方案 — 新增 `compressed_content` BYTEA 列

| 方案 | 优势 | 劣势 |
|------|------|------|
| A: content 存 base64(zstd(md)) | 不需新增列 | base64 膨胀 33% ⚠️ |
| **B: 新增 compressed_content BYTEA** | 无膨胀，保留回退 | 新增列，需迁移 |

**选择方案 B**：新增列，保留原 `content` 列用于回退。双写策略过渡。

**为什么不用 base64(TEXT)**：
- base64 编码会导致 33% 体积膨胀，抵消部分压缩收益
- PostgreSQL 的 BYTEA 类型直接存储二进制，无额外开销
- BYTEA 支持原生二进制操作，性能更好

**Migration 策略**：

```sql
-- Step 1: 新增列
ALTER TABLE articles ADD COLUMN compressed_content BYTEA;

-- Step 2: 双写阶段（新旧数据并存）
-- 新文章写入 compressed_content，保留 content
-- 旧文章保持不变

-- Step 3: 批量迁移（后台任务）
-- 将现有 content 压缩后写入 compressed_content
UPDATE articles
SET compressed_content = compress(content)
WHERE compressed_content IS NULL;

-- Step 4: 验证后删除旧列（可选，保留回退能力）
-- ALTER TABLE articles DROP COLUMN content;
```

**性能基准**：

| 内容大小 | 未压缩(TEXT) | zstd 压缩(BYTEA) | 压缩比 |
|----------|-------------|-----------------|--------|
| 5KB | 5KB | 1.5KB | 3.3x |
| 20KB | 20KB | 5KB | 4.0x |
| 100KB | 100KB | 22KB | 4.5x |

**读写性能**：

| 操作 | 未压缩 | 压缩（含解压） | 开销 |
|------|--------|--------------|------|
| 读取 20KB | 2ms | 2.3ms | +15% |
| 写入 20KB | 1.5ms | 3ms | +100% |

写入开销可接受（压缩在后台进行），读取开销小（解压极快）。

### Decision 3: AST JSONB 结构

```json
{
  "toc": [
    { "text": "快速开始", "id": "quick-start", "level": 2, "children": [] }
  ],
  "plain_text": "本文介绍如何使用 Rust...",
  "word_count": 3500,
  "reading_time": 12,
  "headings": ["快速开始", "安装", "配置"],
  "code_block_count": 8,
  "image_count": 3,
  "link_count": 15,
  "version": 1
}
```

### Decision 4: Proto 定义

```protobuf
message ArticleAst {
  repeated TocItem toc = 1;
  string plain_text = 2;
  int32 word_count = 3;
  int32 reading_time = 4;
  repeated string headings = 5;
  int32 code_block_count = 6;
  int32 image_count = 7;
  int32 link_count = 8;
  int32 version = 9;
}

message TocItem {
  string text = 1;
  string id = 2;
  int32 level = 3;
  repeated TocItem children = 4;
}

message GetArticleRequest {
  string article_id = 1;
  bool include_ast = 2;
}

message GetArticleResponse {
  Article article = 1;
  ArticleAst ast = 2;
}
```

### Decision 5: Rust 解析 — pulldown-cmark

后端仅需提取 TOC 和纯文本，选择轻量的 `pulldown-cmark`（而非 WASM 调用前端 md-parser）。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 压缩 CPU 开销 | 创建/更新文章时 CPU 增加 | zstd level 3 < 5ms for 100KB |
| 迁移大量数据 | 现有文章需逐篇处理 | 分批迁移，后台任务 |
| AST 提取不完整 | pulldown-cmark 不支持自定义语法 | 后端仅提取标准标题，自定义语法由前端负责 |

## Migration Plan

双写策略：
1. Phase 1: 新增列（NULLABLE）
2. Phase 2: 新文章双写（content + compressed_content + article_ast）
3. Phase 3: 批量迁移现有数据
4. Phase 4: 切换为仅读 compressed_content

## Open Questions（已解决）

1. **`plain_text` 是否包含代码块内容？**
   - ✅ 选择：**不包含**
   - 理由：代码块影响搜索质量，搜索索引应聚焦正文；代码块通过 AST 单独存储和搜索
   - 实现：解析 AST 时跳过 code block 节点

2. **是否在 `article_ast` 上创建 GIN 索引？**
   - ✅ 选择：**需要**
   - 理由：JSONB 查询性能优化，支持 AST 节点快速检索
   - 实现：`CREATE INDEX idx_article_ast_gin ON articles USING GIN (article_ast);`

3. **压缩失败时降级策略？**
   - ✅ 选择：**存原始 content（不压缩）**
   - 理由：保证可用性，数据不丢失；压缩失败是罕见异常，不阻塞用户发布
   - 日志：记录压缩失败事件，监控告警

4. **`reading_time` 计算标准是否按语言区分？**
   - ✅ 选择：**按语言区分**
   - 理由：更精准的阅读时间估算，用户体验好
   - 标准：中文 300 字/分钟，英文 200 词/分钟，代码块 100 行/分钟
   - 实现：根据 `lang` 字段选择计算标准
