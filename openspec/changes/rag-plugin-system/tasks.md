## 1. 基础设施

- [ ] 1.1 在 PostgreSQL 中启用 pgvector 扩展 — `CREATE EXTENSION vector`
- [ ] 1.2 创建 `article_embeddings` 表 — article_id + embedding(1536) + HNSW 索引
- [ ] 1.3 更新 `docker/docker-compose.yml` — PostgreSQL 镜像包含 pgvector（pgvector/pgvector:pg16）
- [ ] 1.4 更新迁移脚本 — 在 `services/migration` 中添加 pgvector 扩展和表

> **依赖**：无前置依赖。

## 2. Embedding 服务

- [ ] 2.1 创建 `services/svc-search/` 微服务骨架（或扩展 svc-content）
- [ ] 2.2 实现 Embedding 客户端 — sentence-transformers + BGE-M3 本地调用
- [ ] 2.3 实现批量 Embedding 生成 — 支持批量处理多篇文章
- [ ] 2.4 实现增量更新 — 仅在文章内容变更时重新生成 Embedding
- [ ] 2.5 NATS worker 集成 — 订阅 article.created/updated 事件自动生成 Embedding

> **依赖**：依赖 Phase 1（pgvector 就绪）+ `article-storage-optimization`（plain_text）。

## 3. 语义搜索

- [ ] 3.1 实现查询 Embedding 生成 — 用户搜索查询 → 向量
- [ ] 3.2 实现 pgvector 向量查询 — Cosine 相似度 Top-K
- [ ] 3.3 实现 SemanticSearch gRPC/REST API
- [ ] 3.4 前端搜索集成 — 搜索框支持语义搜索

> **依赖**：依赖 Phase 2。

## 4. 混合搜索

- [ ] 4.1 实现三路并行搜索 — 向量搜索 + Meilisearch 全文 + PostgreSQL 标签匹配
- [ ] 4.2 实现 RRF 融合排序 — Score = Σ 1/(60 + rank_i)
- [ ] 4.3 实现权重配置 — 可调整各搜索源的权重
- [ ] 4.4 实现搜索结果缓存 — Redis 缓存热门搜索
- [ ] 4.5 HybridSearch API — 统一搜索入口
- [ ] 4.6 前端搜索结果页升级 — 显示相关度分数、搜索建议

> **依赖**：依赖 Phase 3 + 现有 Meilisearch 搜索。

## 5. 插件 SDK

- [ ] 5.1 创建 `packages/plugin-sdk/package.json` — name: @luhanxin/plugin-sdk
- [ ] 5.2 实现 definePlugin API — 插件定义和注册
- [ ] 5.3 实现 Extension Point 类型定义 — articleRender/searchEnhance/editorExtend
- [ ] 5.4 实现 useArticleRender hook — 文章渲染增强 API
- [ ] 5.5 实现 useSearchEnhance hook — 搜索增强 API
- [ ] 5.6 实现 postMessage 通信协议 — 插件 ↔ 宿主
- [ ] 5.7 编写插件开发示例 — 创建一个 demo 插件

> **依赖**：无前置依赖。可与 Phase 1-4 并行。

## 6. 插件市场

- [ ] 6.1 新增 Proto 定义 — PluginService + Plugin message
- [ ] 6.2 创建 plugins 表 — 插件元数据存储
- [ ] 6.3 实现插件 CRUD API — 创建/查询/安装/卸载
- [ ] 6.4 实现插件沙箱 — iframe sandbox + postMessage 通信
- [ ] 6.5 实现插件加载器 — 宿主页面动态加载已安装插件
- [ ] 6.6 创建插件市场 UI — 浏览/搜索/安装/配置插件页面
- [ ] 6.7 实现插件权限管理 — 最小权限原则

> **依赖**：依赖 Phase 5（Plugin SDK 就绪）。

## 7. 内置插件

- [ ] 7.1 代码高亮增强插件 — 代码块行号 + 复制按钮 + 语言选择
- [ ] 7.2 目录导航插件 — 文章 TOC 悬浮导航
- [ ] 7.3 阅读进度插件 — 文章阅读进度条
- [ ] 7.4 代码运行插件 — 代码块在线运行（WebAssembly 容器）

> **依赖**：依赖 Phase 6（插件系统就绪）。

## 8. 验证

- [ ] 8.1 语义搜索测试 — 中文/英文/混合查询的相关性
- [ ] 8.2 混合搜索测试 — RRF 排序质量对比纯关键词搜索
- [ ] 8.3 Embedding 性能测试 — 批量生成吞吐量
- [ ] 8.4 插件加载测试 — 多插件同时加载无冲突
- [ ] 8.5 插件沙箱安全测试 — 恶意插件无法访问宿主数据
- [ ] 8.6 更新文档 — tech 文档（RAG 架构 + 插件系统设计）
