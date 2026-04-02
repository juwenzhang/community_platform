## Context

当前后端搜索实现（`svc-content/handlers/article/mod.rs` 第 72-75 行）：

```rust
if !query.is_empty() {
    let pattern = format!("%{query}%");
    base_query = base_query.filter(articles::Column::Title.like(&pattern));
}
```

只匹配标题子串，无相似度排序，不搜索正文。PostgreSQL 16-alpine 自带 `pg_trgm` 扩展模块但未启用。Proto `ListArticlesRequest.query` 字段已存在，无需修改接口。

前端 Layout 顶栏结构：Logo + 导航菜单（左）+ UserArea（右）。搜索框已在顶栏右侧实现（带联想下拉），写文章按钮跳转创作中心。

## Goals / Non-Goals

**Goals:**
1. 启用 pg_trgm 扩展，创建 GIN trigram 索引
2. 搜索范围从「仅 title」扩展到「title + content」
3. 有 query 时按 `similarity()` 相似度排序，实现模糊/相似度搜索
4. 前端搜索联想传递当前 tag 上下文

**Non-Goals:**
- Meilisearch 集成
- 独立搜索结果页
- 搜索高亮

## Decisions

### Decision 1: pg_trgm 相似度搜索

**方案**: 启用 `pg_trgm` 扩展，使用 `similarity()` 函数 + `ILIKE` 组合：

```sql
-- 启用扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram 索引（加速 ILIKE 和 similarity）
CREATE INDEX idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops);
CREATE INDEX idx_articles_content_trgm ON articles USING gin (content gin_trgm_ops);
```

Handler 搜索逻辑改为：
```sql
WHERE (title ILIKE '%query%' OR content ILIKE '%query%')
   OR similarity(title, 'query') > 0.1
ORDER BY similarity(title, 'query') DESC
```

**理由**: pg_trgm 是 PostgreSQL 内置扩展，零额外依赖。三元组算法天然支持模糊匹配（「vue 的利用」能匹配「vue的使用」，因为共享「vue」三元组）。GIN 索引让 ILIKE 和 similarity 查询走索引，不全表扫描。

**替代方案**:
- 方案 B: Meilisearch — 功能更强但引入外部依赖，当前数据量不需要
- 方案 C: PostgreSQL full-text search (tsvector) — 中文支持差，需要额外分词插件

### Decision 2: 搜索有 query 时切换排序

**方案**: 当 `query` 非空时，排序从 `published_at DESC` 切换为 `similarity(title, query) DESC`，让最相关的结果排在前面。

**理由**: 用户搜索时期望按相关性排序，而非时间。无 query 时保持原有时间排序。

### Decision 3: 前端搜索联想的 tag 上下文

**方案**: Layout 组件通过 URL pathname 推断当前页面上下文。如果在首页且 NavSidebar 有选中 tag，搜索联想请求携带该 tag。通过 React Context 或 URL query param 传递。

简化方案：暂不做 tag 联动（需要跨组件状态传递，复杂度高），搜索联想独立于 tag 筛选。tag 筛选保持仅影响首页 ArticleList。

**理由**: tag 联动需要 Layout 感知首页 NavSidebar 的 state，要么提升 state 到 Layout 要么用 Context。本次先做独立搜索，后续如有需求再加 tag 联动。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| pg_trgm similarity 阈值（0.1）可能过低 | 可调整，后续根据实际搜索效果微调 |
| content GIN trigram 索引占用空间 | 文章数量可控，索引大小不是问题 |
| 搜索 content 导致查询变慢 | GIN 索引加速，且 pageSize 限制为 5（联想）或 100（列表） |
| similarity() 在 SeaORM 中需要原始 SQL | 使用 `Expr::cust_with_values` 或 `raw_sql`，已有 tag 查询的先例 |
