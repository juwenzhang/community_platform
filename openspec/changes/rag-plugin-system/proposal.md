## Why

当前平台的搜索能力仅限于 Meilisearch 全文搜索 + pg_trgm 模糊搜索，存在以下局限：

1. **语义搜索缺失** — 用户搜索「如何优化 Rust 编译速度」无法匹配到标题为「Cargo 构建性能调优指南」的文章
2. **跨语言搜索弱** — 中文/英文技术术语的搜索匹配不精准
3. **代码搜索不支持** — 无法搜索文章中的代码片段
4. **开发者扩展困难** — 平台功能固定，开发者无法为平台提供增强功能（如语法检查插件、代码格式化插件）
5. **无插件市场** — 缺乏平台级的扩展生态

需要两套系统：
- **RAG 检索增强** — 向量数据库 + Embedding 模型，实现语义搜索
- **插件系统** — 开发者可编程的平台扩展机制，提供 API + SDK + 市场

## What Changes

### RAG 检索增强

- **Embedding 服务** — 文章发布时自动生成向量 Embedding
- **向量存储** — pgvector（PostgreSQL 扩展）或 Qdrant
- **语义搜索 API** — 用户查询 → Embedding → 向量相似度搜索 → 混合排序
- **混合搜索** — 向量搜索（语义）+ 关键词搜索（Meilisearch）+ 标签匹配 → RRF 融合排序

### 插件系统

- **插件 SDK** — `@luhanxin/plugin-sdk`，开发者创建插件的脚手架和 API
- **插件 API** — 平台提供的 Hook/Extension Point（文章渲染增强、搜索增强、编辑器扩展等）
- **插件注册中心** — 插件元数据管理（名称/版本/权限/作者）
- **插件市场 UI** — 浏览/安装/配置/禁用插件
- **插件沙箱** — 前端插件在 iframe 沙箱中运行，后端插件通过 WebAssembly 运行

### Embedding 模型

- 支持多模型：BGE-M3（开源，推荐） / text-embedding-ada-002（可选） / 本地部署
- 文章 Embedding：基于 `article_ast.plain_text` + `article_ast.headings` 生成
- 查询 Embedding：用户搜索查询实时生成

## 非目标 (Non-goals)

- **不做 AI 对话式搜索** — ChatGPT 风格的对话搜索在后续 change
- **不做代码执行沙箱** — 插件代码执行沙箱的安全模型在后续完善
- **不做插件支付** — 付费插件市场在后续 change
- **不做全文 AI 问答** — 基于 RAG 的文章问答在后续 change

## 与现有设计文档的关系

- **`openspec/changes/ai-article-summary/`** — RAG 依赖 AI 摘要的 plain_text 和标签
- **`openspec/changes/article-storage-optimization/`** — RAG 依赖 article_ast 的结构化数据
- **`docs/design/2026-03-20/03-backend-architecture.md`** — 新增 svc-search 微服务或扩展 svc-content

## Capabilities

### New Capabilities

- `semantic-search`: 语义搜索 — 向量 Embedding + pgvector/Qdrant
- `hybrid-search`: 混合搜索 — 向量 + 全文 + 标签 RRF 融合排序
- `plugin-sdk`: 插件 SDK — 开发者创建插件的脚手架
- `plugin-api`: 插件 API — 平台 Extension Point
- `plugin-marketplace`: 插件市场 — 浏览/安装/配置插件

### Modified Capabilities

- `article-search`: 文章搜索升级 — 从关键词搜索升级为语义+混合搜索
- `article-publish`: 文章发布流程 — 新增 Embedding 生成步骤

## Impact

### 新增基础设施

| 组件 | 说明 |
|------|------|
| pgvector | PostgreSQL 向量搜索扩展（或 Qdrant） |
| Embedding 模型服务 | 本地部署（BGE-M3，零成本） |
| svc-search | 搜索微服务（或扩展 svc-content） |

### 新增代码

| 范围 | 说明 |
|------|------|
| `packages/plugin-sdk/` | 插件开发 SDK |
| `services/svc-search/` | 搜索微服务（Embedding + 向量搜索 + 混合排序） |

### Proto 影响

新增 `search.proto` — SemanticSearch/InstallPlugin RPC
