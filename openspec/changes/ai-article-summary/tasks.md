## 1. Proto 定义

- [ ] 1.1 创建 `proto/luhanxin/community/v1/ai.proto` — AIGenSummary/AIExtractTags/RelatedArticles RPC
- [ ] 1.2 执行 `make proto`

> **依赖**：无前置依赖。

## 2. svc-ai 微服务

- [ ] 2.1 创建 `services/svc-ai/` 微服务骨架 — Cargo.toml + main.rs + config.rs
- [ ] 2.2 实现 LLM 客户端 — Ollama API 调用（reqwest）
- [ ] 2.3 实现 Prompt 模板管理 — 摘要/标签提取 Prompt 配置化
- [ ] 2.4 实现速率限制 — 每分钟最大调用次数（GPU 资源管理）
- [ ] 2.5 实现重试 + 超时 — LLM 调用失败重试策略

> **依赖**：无前置依赖。可与 Phase 1 并行。

## 3. AI 摘要生成

- [ ] 3.1 实现 GenerateSummary gRPC handler — 调用 LLM 生成摘要
- [ ] 3.2 实现 NATS worker — 订阅 article.created/updated 事件，异步生成摘要
- [ ] 3.3 实现摘要存储 — 更新 articles.summary 字段
- [ ] 3.4 实现降级策略 — LLM 调用失败时使用纯文本截取（前 200 字）
- [ ] 3.5 前端显示 — 文章列表/详情页显示 AI 摘要

> **依赖**：依赖 Phase 1 + Phase 2 + `article-storage-optimization`（需要 plain_text）。

## 4. 自动标签提取

- [ ] 4.1 实现 ExtractTags gRPC handler — 调用 LLM 提取标签
- [ ] 4.2 实现标签合并策略 — AI 标签 + 作者标签取并集，去重
- [ ] 4.3 集成到 NATS worker — 与摘要生成并行执行
- [ ] 4.4 标签标准化 — 与现有标签体系对齐

> **依赖**：依赖 Phase 2。

## 5. 阅读时间估算

- [ ] 5.1 实现阅读时间计算函数 — 中文 400字/分钟 + 英文 200词/分钟
- [ ] 5.2 集成到 article_ast — 写入 article_ast.reading_time
- [ ] 5.3 前端显示 — 文章详情页显示「约 X 分钟阅读」
- [ ] 5.4 更新文章列表 — 列表 API 返回 reading_time

> **依赖**：依赖 `article-storage-optimization`（article_ast 列）。

## 6. 相关文章推荐

- [ ] 6.1 实现标签匹配算法 — Jaccard 相似度计算共享标签
- [ ] 6.2 实现 TF-IDF 文本相似度 — 基于 article_ast.plain_text
- [ ] 6.3 实现加权排序 — 标签 0.6 + 文本 0.4
- [ ] 6.4 实现 Redis 缓存 — 推荐结果缓存 1 小时
- [ ] 6.5 新增 RelatedArticles RPC — 文章详情页调用
- [ ] 6.6 前端相关推荐组件 — 文章详情页底部推荐列表

> **依赖**：依赖 `article-storage-optimization`（plain_text）。

## 7. Gateway 集成

- [ ] 7.1 在 Gateway 注册 svc-ai 路由
- [ ] 7.2 实现 REST API 包装

> **依赖**：依赖 Phase 3-6。

## 8. 验证

- [ ] 8.1 摘要质量测试 — 多种类型文章的摘要准确性
- [ ] 8.2 标签提取测试 — 标签相关性和覆盖率
- [ ] 8.3 阅读时间测试 — 估算准确性
- [ ] 8.4 推荐质量测试 — 推荐结果的相关性
- [ ] 8.5 降级测试 — LLM 不可用时的 fallback
- [ ] 8.6 更新文档
