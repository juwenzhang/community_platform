## Why

当前文章内容直接存储原始 Markdown 到 `articles.content` TEXT 字段，无任何压缩。随着平台文章数量增长和内容丰富度提升，这种简单存储方案暴露出以下问题：

1. **存储空间浪费** — 长篇技术文章（包含大量代码块、Mermaid 图表、LaTeX 公式）的原始 Markdown 通常在 20KB-200KB 之间，无压缩直接存储导致数据库体积膨胀
2. **缺少结构化数据** — 后端只存储原始 Markdown 文本，无法提取 TOC（目录）、元数据、纯文本等结构化数据，导致搜索优化、AI 分析、快速预览等高级功能无法实现
3. **摘要字段未利用** — `articles.summary` 字段已存在但仅存储用户手动输入的摘要，无法支持 AI 自动生成摘要（预留给 `ai-article-summary` change）
4. **后端无解析能力** — 当前 Markdown 解析完全依赖前端，后端无法独立生成 OG 图片、邮件通知内容、搜索索引

需要一套后端文章存储优化方案：透明压缩存储 + AST/TOC 结构化数据提取，为后续的搜索优化和 AI 分析打下基础。

## What Changes

### 文章内容压缩存储

- 文章 `content` 字段读写时透明压缩/解压（zstd 算法）
- 新增 `compressed_content` BYTEA 列存储压缩后的内容，保留原 `content` 列用于回退

### 新增 `article_ast` JSONB 列

- 存储解析后的结构化数据：TOC 目录树、纯文本、字数统计、阅读时间估算、标题列表、代码块/图片/链接计数
- 创建/更新文章时自动从 Markdown 提取并写入
- 为搜索索引（Meilisearch）和 AI 分析提供数据源

### Proto 定义更新

- 新增 `ArticleAst` + `TocItem` message 定义
- `GetArticleRequest` 新增 `include_ast` 控制字段
- `GetArticleResponse` 可选返回 AST 数据

### 后端 Markdown 解析集成

- 集成 `pulldown-cmark` crate，实现 TOC 提取和纯文本提取

### 数据库迁移

- 新增 `article_ast` JSONB 列 + `compressed_content` BYTEA 列（均为 NULLABLE，兼容现有数据）
- 后台迁移脚本批量处理现有文章

## 非目标 (Non-goals)

- **不做前端变更** — 前端消费 AST 的变更由后续 change 实施
- **不引入新的基础设施** — 不引入对象存储（S3/MinIO）、CDN 等新组件
- **不做 AI 摘要生成** — 仅预留 summary 字段，AI 摘要由 `ai-article-summary` change 负责
- **不做前端 Markdown 解析变更** — 前端 `@luhanxin/md-parser` 包的改造不在本次范围

## 与现有设计文档的关系

- **`docs/design/2026-03-20/03-backend-architecture.md`** — 本次变更属于后端微服务架构中的 svc-content 服务优化
- **`docs/design/2026-03-20/04-database-design.md`** — 文章表结构扩展（新增 JSONB 列、压缩存储列）
- **`openspec/changes/markdown-parser-package/`** — 前端 Markdown 解析已在前一个 change 中设计，本次为后端对应实现

## Capabilities

### New Capabilities

- `compressed-article-storage`: 文章内容透明压缩存储 — zstd 压缩算法，预计节省 60%-80% 存储空间
- `article-ast-store`: 文章 AST 结构化存储 — JSONB 存储 TOC、纯文本、字数统计、阅读时间等

### Modified Capabilities

- `article-crud`: 文章 CRUD 增强 — 创建/更新时自动解析 AST + 压缩存储

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `services/svc-content/` | 修改 | handler 集成压缩/解压 + AST 解析 |
| `services/shared/src/entity/articles.rs` | 修改 | 新增 `article_ast`、`compressed_content` 字段 |
| `proto/luhanxin/community/v1/article.proto` | 修改 | 新增 `ArticleAst`、`TocItem` message |
| `services/migration/` | 新增 | 迁移脚本 |

### API 影响

| RPC | 变更类型 | 说明 |
|-----|---------|------|
| `GetArticle` | 响应扩展 | 新增可选 `ArticleAst ast` 字段 |
| `GetArticleRequest` | 请求扩展 | 新增 `bool include_ast` 字段 |
| `CreateArticle` | 行为变更 | 自动解析 AST + 压缩存储 |
| `UpdateArticle` | 行为变更 | content 变更时自动重新解析 AST |

### 依赖影响

新增 Rust 依赖：`zstd`（压缩）、`pulldown-cmark`（Markdown 解析）

### 数据库影响

- `articles` 表新增 `article_ast` JSONB 列（NULLABLE）
- `articles` 表新增 `compressed_content` BYTEA 列（NULLABLE）
