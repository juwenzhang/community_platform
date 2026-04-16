---
name: batch-openspec-platform-upgrades
overview: 一次性创建 10 个 OpenSpec changes，覆盖用户提出的所有平台升级方向：Markdown 解析引擎、评论升级、存储优化、WebSocket 实时通知、埋点监控、新一代编辑器、无头浏览器截图、AI 智能总结、RAG+插件系统、前端子应用拆分。仅落地设计文档，不涉及代码实现。
todos:
  - id: openspec-frontend-split
    content: Use [skill:openspec-propose] 创建前端子应用拆分评估的 OpenSpec change
    status: completed
  - id: openspec-md-parser
    content: Use [skill:openspec-propose] 创建 Markdown 解析引擎包的 OpenSpec change
    status: completed
  - id: openspec-storage-opt
    content: Use [skill:openspec-propose] 创建后端存储优化的 OpenSpec change
    status: completed
    dependencies:
      - openspec-md-parser
  - id: openspec-comment-upgrade
    content: Use [skill:openspec-propose] 创建评论系统升级的 OpenSpec change
    status: completed
  - id: openspec-websocket
    content: Use [skill:openspec-propose] 创建 WebSocket 实时通知的 OpenSpec change
    status: completed
  - id: openspec-analytics
    content: Use [skill:openspec-propose] 创建埋点+监控系统的 OpenSpec change
    status: completed
  - id: openspec-editor
    content: Use [skill:openspec-propose] 创建新一代文档编辑器的 OpenSpec change
    status: completed
    dependencies:
      - openspec-frontend-split
      - openspec-md-parser
  - id: openspec-screenshot
    content: Use [skill:openspec-propose] 创建无头浏览器截图服务的 OpenSpec change
    status: completed
  - id: openspec-ai-summary
    content: Use [skill:openspec-propose] 创建文章智能总结系统的 OpenSpec change
    status: completed
  - id: openspec-rag-plugins
    content: Use [skill:openspec-propose] 创建 RAG 检索增强+插件系统的 OpenSpec change
    status: completed
    dependencies:
      - openspec-ai-summary
---

## Product Overview

用户在体验现有社区平台后，提出了一系列升级方向。核心诉求是将所有想法以 OpenSpec 设计文档形式落地到代码仓库中，即使不立即实现，也要确保思路被持久化。

## Core Features

需要为以下 9 个升级方向 + 1 个前端拆分评估创建完整的 OpenSpec 变更文档（proposal + design + tasks）：

1. **前端子应用拆分评估** — 从 main 拆出 apps/article（文章详情+编辑）+ apps/search（搜索），评估 profile 拆分
2. **Markdown 解析引擎包** (`@luhanxin/md-parser`) — 自定义 MD 解析、AST 提取、GFM 扩展、作为 packages 共享
3. **后端存储优化** — 文章 content 压缩存储、新增 article_ast JSONB 列存 TOC/元数据、迁移脚本
4. **评论系统升级** — 无限滚动、排序（热门/最新）、评论点赞、Markdown 评论渲染
5. **WebSocket 实时通知** — Gateway 新增 /ws 端点、前端 WS client 替代轮询、NATS→WS 桥接
6. **埋点+监控系统** (`@luhanxin/tracker`) — 自研 SDK、ClickHouse 存储、Grafana Dashboard、告警规则
7. **新一代文档编辑器** (`@luhanxin/editor`) — 类飞书/语雀块编辑器、Yjs 协同编辑、版本历史、公开分享
8. **无头浏览器截图服务** — Playwright 服务端渲染、OG 图片生成、PDF 导出、页面归档追溯
9. **文章智能总结系统** — AI 摘要生成、自动标签提取、阅读时间估算、相关推荐
10. **RAG 检索增强 + 插件系统** — 向量检索、开发者插件 API、平台增强市场

## Tech Stack

- 现有技术栈不变（Rust + Axum + Tonic + SeaORM + React + Garfish + Protobuf）
- OpenSpec 工作流：使用 `[skill:openspec-propose]` 逐个生成变更文档
- 新增基础设施组件：ClickHouse（埋点）、pgvector（RAG）、Playwright（截图服务）

## Implementation Approach

使用 `openspec-propose` skill 为每个升级方向生成完整的 proposal + design + tasks 三件套。按照依赖关系排序：

- 先做基础设施/拆分评估（不影响现有代码但影响后续设计）
- 再做核心包和存储优化
- 最后做复杂特性（编辑器、AI、RAG）

每个 change 的 proposal 遵循已有格式：Why / 非目标 / 与现有设计文档的关系 / What Changes。Design 文档中涉及 API 使用 Protobuf 定义，前端使用 TypeScript，后端使用 Rust。

此任务不涉及 UI 创建或改造，纯粹是 OpenSpec 文档生成工作。

## Agent Extensions

### Skill

- **openspec-propose**
- Purpose: 为每个升级方向快速生成完整的 OpenSpec 变更文档（proposal + design + tasks）
- Expected outcome: 10 个 OpenSpec change 目录，每个包含完整的提案、设计和技术任务拆分文档