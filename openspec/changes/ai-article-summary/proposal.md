## Why

平台文章数量增长后，读者需要快速判断一篇文章是否值得阅读。当前完全依赖作者手动填写的摘要，存在以下问题：

1. **摘要质量参差不齐** — 很多作者不写摘要，或者摘要质量不高
2. **阅读时间不显示** — 读者无法预估阅读时间
3. **标签依赖人工** — 标签需要作者手动添加，经常遗漏
4. **相关文章推荐弱** — 仅基于标签匹配，缺少语义理解
5. **搜索结果质量低** — 仅关键词匹配，无法理解语义

需要一个 AI 驱动的智能总结系统，在文章创建/更新时自动生成摘要、提取标签、估算阅读时间，并为相关文章推荐和语义搜索提供基础。

## What Changes

### AI 摘要生成

- 文章创建/更新时，自动调用 LLM 生成 200 字以内的中文摘要
- 支持自定义 Prompt 模板（可调整摘要风格）
- 异步生成：不阻塞文章保存流程，通过消息队列异步处理
- 摘要存储：写入 `articles.summary` 字段（预留给 `article-storage-optimization` change）

### 自动标签提取

- LLM 从文章内容中提取 3-5 个关键标签
- 与现有标签体系对齐（使用文章已有的 tags 列表）
- 标签合并策略：AI 标签 + 作者标签取并集

### 阅读时间估算

- 中文字符数 / 400 + 英文单词数 / 200 = 阅读时间（分钟）
- 代码块按字符数 × 2 计算（代码阅读更慢）
- 预估结果写入 `article_ast` JSONB 列

### 相关文章推荐

- 基于标签匹配 + TF-IDF 文本相似度
- 文章详情页显示「相关推荐」列表（5-10 篇）
- Redis 缓存推荐结果（文章更新时失效）

### LLM 集成架构

- 通过 Ollama API 调用开源 LLM（Qwen/DeepSeek/Mistral）
- Prompt 模板管理（可配置/可版本化）
- 速率限制和资源控制（GPU 资源管理）

## 非目标 (Non-goals)

- **不做向量检索** — 向量数据库/RAG 在 `rag-plugin-system` change 中设计
- **不做实时 AI 对话** — 文章内 AI 助手对话在后续 change
- **不做多语言摘要** — 仅支持中文摘要（后续可扩展）
- **不做 AI 改写/润色** — AI 辅助写作在编辑器 change 中

## 与现有设计文档的关系

- **`openspec/changes/article-storage-optimization/`** — 摘要写入 summary 字段，阅读时间写入 article_ast
- **`openspec/changes/markdown-parser-package/`** — 使用 md-parser 的纯文本提取能力

## Capabilities

### New Capabilities

- `ai-summary`: AI 摘要生成 — LLM 自动生成文章摘要
- `ai-tag-extraction`: 自动标签提取 — LLM 提取文章关键词标签
- `reading-time-estimation`: 阅读时间估算 — 基于字数自动计算
- `related-articles`: 相关文章推荐 — 标签匹配 + 文本相似度

## Impact

### 新增

- `services/svc-ai/` — AI 服务微服务（LLM 调用 + Prompt 管理）
- 或集成到 `services/svc-content` 中（作为异步 worker）

### 修改

- `articles.summary` — AI 生成的摘要
- `articles.tags` — AI 提取的标签合并
- 文章详情页 — 显示阅读时间、相关推荐

### Proto 影响

新增 `ai.proto` — GenerateSummary/ExtractTags RPC
