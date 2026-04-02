## Why

当前平台「写文章」入口藏得太深（点头像 → 创作中心 → 新建文章，3 步），作为内容社区平台，创作入口应在顶栏一键可达。同时，搜索能力严重不足：

1. **后端只有 `Title LIKE '%query%'`**：纯子串匹配，输入「vue 的利用」搜不到「vue的使用」
2. **不搜索 content（正文）**：只匹配标题
3. **前端顶栏搜索没传 tag 参数**：与侧边栏 tag 筛选割裂
4. **侧边栏 tag 仅影响首页**：全局搜索无法按 tag 过滤

需要：
- 启用 PostgreSQL `pg_trgm` 扩展实现相似度搜索（三元组匹配）
- 后端搜索扩展到 title + content，支持 `similarity()` 排序
- 前端搜索联想支持 tag 上下文
- 创建 GIN trigram 索引加速搜索

## What Changes

### 顶栏「写文章」按钮
- 在 Layout 顶栏右侧添加「写文章」按钮，已登录跳转 `/profile/manage`（创作中心），未登录跳转 `/auth`

### 顶栏全局搜索框 + 联想搜索
- 顶栏右侧搜索输入框，300ms debounce
- Popover 下拉展示前 5 条匹配文章，点击跳转详情
- 搜索联想支持当前页面的 tag 上下文（如首页选中了「前端」tag）

### 后端搜索增强
- 新增 migration：启用 `pg_trgm` 扩展 + 创建 GIN trigram 索引（title, content）
- `list_articles` handler：`LIKE` 替换为 `similarity()` + `ILIKE` 组合，搜索范围扩展到 title + content
- 搜索结果按相似度排序（有 query 时）

## Non-goals（非目标）

- 独立 `/search` 搜索结果页面（后续 change）
- Meilisearch 全文搜索集成（pg_trgm 够用，后续按需升级）
- 搜索历史 / 自动补全 / 搜索建议
- 移动端适配优化

## Capabilities

### New Capabilities
- `header-write-button`: 顶栏「写文章」快捷按钮
- `home-search`: 顶栏全局搜索框 + 联想搜索下拉
- `pg-trgm-search`: PostgreSQL pg_trgm 相似度搜索（migration + handler + 索引）

### Modified Capabilities
- `header-user-menu`: UserArea 组件布局调整，为搜索框和写文章按钮腾出空间

## Impact

- **后端 migration/**: 新增 `m20260402_000001_enable_pg_trgm.rs`（启用扩展 + 创建索引）
- **后端 svc-content/**: `handlers/article/mod.rs` 搜索逻辑改为 pg_trgm 相似度 + ILIKE
- **前端 components/**: `Layout/index.tsx` 顶栏搜索框 + 写文章按钮
- **前端 styles/**: Layout 样式更新
- **无 Proto 变更**：`query` 字段语义不变，后端实现透明升级

## 与现有设计文档的关系

- 遵循 `docs/design/2026-03-20/02-frontend-architecture.md` 的组件规范
- 后端修改遵循 `services/svc-content/src/handlers/article/mod.rs` 现有模式
- migration 遵循 SeaORM migration 现有命名和结构规范
