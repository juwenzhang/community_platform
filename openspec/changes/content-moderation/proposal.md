## Why

社区平台上线前需要基础的内容合规能力，当前系统**完全没有**内容审核：

| 场景 | 现状 | 风险 |
|------|------|------|
| 文章标题/正文 | 无任何过滤 | 发布违禁内容、广告、辱骂等 |
| 评论 | 无任何过滤 | 同上，且频率高 |
| 用户 displayName / bio | 无任何过滤 | 恶意用户名、隐蔽广告 |
| 外链 | 无黑名单 | 钓鱼链接、赌博链接 |
| 发文频率 | 无限流 | 水军批量发文 |

国内合规要求敏感词过滤是**红线**，不做无法上线。本 change 提供基础的服务端审核能力。

## What Changes

### 新建 `svc-moderation`（轻量 Rust 微服务）

或者作为 `shared` crate 的模块集成到 `gateway` 内（设计阶段决定）。提供：

- 敏感词过滤（AC 自动机，`aho-corasick` crate）
- 敏感词库管理（配置化 + 分级：禁止 / 警告 / 需审）
- 外链黑名单（hash set）
- 发文频率限流（Redis 计数器）

### Gateway 拦截器接入

扩展现有 `gateway/interceptors/`，新增 `moderation` 拦截器：
- 作用于 `CreateArticle` / `UpdateArticle` / `CreateComment` / `UpdateProfile`
- 检测到违禁词 → 返回 `PermissionDenied` + 提示用户
- 检测到可疑词 → 标记为待审状态（`articles.moderation_status = pending`）

### 数据库扩展

- `articles` 表新增 `moderation_status` 枚举（approved / pending / rejected）
- `comments` 同上
- `moderation_logs` 新表记录审核历史

### 后台审核 UI（最小版）

- 管理员页面列出 pending 状态内容
- 一键通过 / 驳回
- 详细审核逻辑（举报处理、申诉）留给未来 change

### 敏感词库

- 初始库：GitHub 开源（如 `textfilter` 词库）
- 配置文件 `config/sensitive-words.yaml`
- 支持热加载（修改配置不需重启服务）

## 非目标 (Non-goals)

- **不做 AI 语义审核** — L2 模型服务（开源如 `text-moderation-multilingual` 或商业 API）留给未来
- **不做图片审核** — 属于 `self-hosted-image-pipeline` 的客户端 NSFW 检测（L1）和未来 `svc-moderation-image`（L2）
- **不做完整的举报/申诉工作流** — 本 change 只做阻止 + 标记待审，完整工作流属于 `report-system` change
- **不做用户封禁系统** — 属于 `user-ban-system` change
- **不做外部合规对接** — 不对接公安网监、阿里云内容安全等第三方（可作未来选项）

## 与现有设计文档的关系

| 文档/change | 关系 |
|---|---|
| `gateway-interceptor` spec | 新增 moderation 拦截器，复用现有架构 |
| `svc-content` | 新增 moderation_status 字段消费 |
| `admin-dashboard` change | 后台审核 UI 可能归入该 change 或单独处理 |
| `self-hosted-image-pipeline` | 图片 L1 审核在该 change，服务端文本审核在本 change |

## Capabilities

### New Capabilities

- `sensitive-word-filter`: 敏感词过滤 — AC 自动机 + 分级词库 + 热加载
- `external-link-blocklist`: 外链黑名单 — 文章/评论中的外链风控
- `rate-limit-posting`: 发文频率限流 — Redis 计数器 + 分级策略（新用户更严）
- `moderation-status-tracking`: 审核状态追踪 — articles/comments 新增状态字段

### Modified Capabilities

- `gateway-interceptor`: Gateway 拦截器扩展 — 新增 moderation 拦截器
- `article-crud`: 文章 CRUD 接入审核 — create/update 经过 moderation 检查
- `comment-crud`: 评论 CRUD 接入审核

## Impact

### 代码影响

| 范围 | 变更 |
|------|------|
| `services/gateway/src/interceptors/moderation/` | **新增** |
| `services/shared/src/moderation/` | **新增** |
| `services/svc-content/src/handlers/` | **修改** 读取 moderation 拦截器结果 |
| `services/migration/` | **新增** moderation_status 迁移 |
| `proto/luhanxin/community/v1/article.proto` | **修改** 新增 moderation_status enum |
| `apps/main` UI | **新增** 违规提示组件 + 审核状态指示 |
| `config/sensitive-words.yaml` | **新增** |

### 依赖影响

新增 Rust 依赖：
- `aho-corasick`（AC 自动机）
- 可选：`serde_yaml`（词库配置）

### 性能影响

- 拦截器增加 < 5ms（AC 自动机查 10k 词库 < 1ms）
- Redis 限流查询 < 2ms

### 合规影响

- 满足国内《网络信息内容生态治理规定》基础要求
- 初始词库能拦截 80% 明显违规，剩余 20% 依赖未来 L2 + 人工审核
