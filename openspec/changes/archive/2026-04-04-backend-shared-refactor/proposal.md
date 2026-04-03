## Why

后端代码库在快速迭代中积累了大量架构债务：**30+ 个工具函数在 4 个 crate 间重复实现**（如 `datetime_to_timestamp`、`parse_uuid`、`extract_user_id` 等），Gateway 的 REST 路由中 DTO 和 ApiError 有 4 套不一致定义，**微服务缺少独立的 DAO 层**导致数据库查询散落在 handler 函数中无法复用和 mock，**60+ 处硬编码值**（包括 P0 级安全隐患：DB 凭据默认值、JWT Secret 默认值、CORS 全开），以及 **Gateway 作为 BFF 层大部分接口只做单服务透传**而非数据聚合，导致前端被迫发起 N+1 请求。

这些问题正在拖慢开发效率、引入隐性 bug（如 `inject_user_id` 在不同服务中语义不一致），并且存在安全风险。趁着项目仍处于早期阶段，现在统一重构的成本远低于后续逐个修补。

## What Changes

### 共享工具层提升（Shared Crate 增强）

- 将 30+ 重复函数收敛到 `shared` crate 的新模块：
  - `shared::convert` — Proto ↔ Model 转换函数（`datetime_to_timestamp`、`user_model_to_proto`、`article_model_to_proto` 等）
  - `shared::extract` — gRPC 请求提取工具（统一版本的 `extract_user_id`、`try_extract_user_id`、`db_unavailable`）
  - `shared::constants` — 编译期常量（NATS Subject 前缀、服务名、元数据 Key、业务规则常量）
- 删除各服务内的重复实现，统一引用 shared

### DAO 层（Repository 模式）引入

- 在每个微服务内部新增 `repositories/` 目录，封装所有 SeaORM 查询操作
- handler 层只调用 repository 方法，不再直接构造 SeaORM 查询链
- **解决跨域违规**：移除 `svc-content/handlers/comment/mod.rs` 中直接查 users 表的代码，改为通过 Gateway BFF 层聚合用户信息

### Gateway DTO 统一

- 将 `routes/` 中散落的 inline DTO（`ArticleDto`、`UserDto`、`ApiError` 等）提取到 `gateway/src/dto/` 模块
- 统一 `ApiError` 格式为 `{ code: string, message: string }`，所有路由共用
- 提取 `extract_bearer()`、`build_metadata()` 等重复的 REST 工具函数到 `gateway/src/routes/helpers.rs`

### 硬编码值治理

- **P0 安全修复**：移除 DB 凭据和 JWT Secret 的默认值，改为缺少环境变量直接 panic（fail-fast）；CORS 策略收紧为环境变量可配置的白名单
- **P1 运维收敛**：NATS Subject 前缀、服务名、端口号、超时等统一到 `shared::constants` 或 `AppConfig`
- **P2 业务常量**：分页默认值、校验规则、bcrypt cost 等提取为命名常量
- 激活并完善 `shared::config::AppConfig`（目前写了没人用）

### Gateway BFF 数据聚合

- `GetArticleDetail` — 聚合文章内容 + 互动状态 + 评论预览 + 作者信息为单个响应
- `ListFavorites` — 填充每个收藏条目的作者信息和文章摘要（当前只返回 `author_id` 字符串）
- `ListComments` — 在 Gateway 层填充评论者用户信息（替代 svc-content 跨域查 users 表的违规行为）
- REST 路由与 gRPC 路由保持一致的聚合行为（当前 gRPC 路径文章列表有 `fill_authors()`，REST 路径没有）

### 语义一致性修复

- 统一 `inject_user_id` 行为：**需认证接口 → 缺 user_id 返回 `Unauthenticated`**；**可选认证接口 → 用 `try_extract_user_id` 静默跳过**
- 统一 NATS 用法：svc-content 改为使用 `shared::messaging::NatsClient`（目前直接用原生 `async_nats::Client`）
- 激活 `shared::error::AppError`，各微服务的 `error.rs` 改为引用共享定义

## 非目标 (Non-goals)

- **不涉及前端代码变更**：前端重复代码较少，不在本次重构范围
- **不涉及 Proto 定义变更**：已有的 `.proto` 文件不做结构调整（但可能新增聚合用的 RPC 方法）
- **不涉及数据库 schema 变更**：不修改 migration 或表结构
- **不引入新的基础设施组件**：不增加新的中间件或外部依赖
- **不做性能优化**：`fill_authors()` 的 N+1 问题（应改为批量查询）在本次记录但不作为强制目标
- **不修改微前端架构**：Garfish / app-registry / dev-kit 不在范围内

## 与现有设计文档的关系

- **`docs/design/2026-03-20/03-backend-architecture.md`** — 本次重构遵循其微服务分层架构设计，补充缺失的 DAO 层和共享工具层
- **`docs/design/2026-03-20/01-tech-overview.md`** — 与整体技术栈选型保持一致，不引入新技术
- **`docs/tech/06-gateway-interceptor-pattern.md`** — Gateway 拦截器模式保持不变，只清理重复的 `inject_user_id` 实现
- **`docs/tech/07-swagger-interceptor-consul-healthcheck.md`** — REST 路由双路径架构保持不变，只提取 DTO 和工具函数

## Capabilities

### New Capabilities

- `shared-utils`: 后端共享工具模块 — 涵盖 `convert`（类型转换）、`extract`（gRPC 请求提取）、`constants`（编译期常量）三个子模块
- `backend-repository`: 微服务 DAO/Repository 层 — 封装 SeaORM 数据库查询，handler 不再直接操作 DatabaseConnection
- `gateway-dto`: Gateway REST DTO 统一 — 独立的 `dto/` 模块，统一 ApiError、所有资源 DTO、REST 工具函数
- `gateway-bff-aggregation`: Gateway BFF 数据聚合 — 文章详情聚合、收藏列表聚合、评论列表用户信息填充
- `config-hardcode-cleanup`: 硬编码值治理 — 安全凭据 fail-fast、运维常量收敛、业务常量命名

### Modified Capabilities

- `backend-directory-structure`: 微服务目录结构新增 `repositories/` 层和 `dto/` 目录
- `gateway-connect-protocol`: Gateway BFF 代理模式增强为真正的聚合模式，不再是纯透传
- `gateway-interceptor`: `inject_user_id` 语义统一为 shared 模块提供的标准实现
- `nats-messaging`: svc-content 统一使用 `shared::messaging::NatsClient`
- `jwt-auth`: 移除 JWT Secret 默认值，缺少环境变量时 panic
- `database-connection`: 移除数据库 URL 默认凭据，缺少环境变量时 panic

## Impact

### 代码影响

| 范围 | 影响文件数 | 变更类型 |
|------|-----------|---------|
| `services/shared/src/` | 新增 3-5 个模块文件 | 新增功能 |
| `services/svc-user/src/handlers/` | ~5 个文件 | 重构（提取到 repository + 删除重复函数） |
| `services/svc-content/src/handlers/` | ~5 个文件 | 重构（提取到 repository + 删除重复函数 + 移除跨域查询） |
| `services/gateway/src/routes/` | ~4 个文件 | 重构（提取 DTO + 删除重复函数） |
| `services/gateway/src/services/` | ~4 个文件 | 增强（添加 BFF 聚合逻辑） |
| `services/gateway/src/` | 新增 `dto/` 目录 | 新增模块 |
| `services/svc-*/src/` | 各新增 `repositories/` 目录 | 新增模块 |
| 配置和常量文件 | ~10 个文件 | 修改（硬编码值替换） |

### API 影响

- 新增聚合 RPC 方法（`GetArticleDetail` 等）可能需要新增 Proto message（但这不影响已有接口的兼容性）
- REST API 响应格式中 `ApiError` 统一为 `{ code, message }` — **BREAKING**（影响已使用 `{ error }` 格式的前端代码）

### 依赖影响

- 无新增外部 crate
- `shared` crate 的公共 API 扩展（新增模块），下游 crate 需要更新 import 路径

### 测试影响

- 引入 repository 层后，handler 可以 mock repository 进行纯逻辑测试
- 现有 gRPC 集成测试需要验证重构后行为不变
