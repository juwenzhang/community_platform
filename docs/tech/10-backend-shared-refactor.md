# Backend Shared Refactor — 后端共享层重构与硬编码治理

> 📅 创建日期：2026-04-04
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · 重构 · 架构治理 · Rust

---

## 1. 问题背景

经过快速迭代，后端 4 个 crate（`gateway`、`svc-user`、`svc-content`、`shared`）积累了以下技术债务：

- **30+ 个重复函数**分散在各微服务中（`datetime_to_timestamp`、`parse_uuid`、`db_error`、`extract_user_id`、`user_model_to_proto`、`article_model_to_proto` 等）
- **58+ 处硬编码字面量**（NATS subject、服务名、metadata key、分页值、校验规则）
- **安全隐患**：`DATABASE_URL` 和 `JWT_SECRET` 有默认凭据，CORS 使用 `AllowOrigin::any()`
- **Gateway REST 路由**中 4 套不一致的 ApiError 格式和重复的辅助函数
- **Gateway gRPC services** 中 `inject_user_id` 语义不一致（article/user 强制认证 vs comment/social 静默跳过）
- **svc-content** 的 comment handler 直接查询 `users` 表（跨越 svc-user 的数据域）

## 2. 重构方案

### 2.1 新增 shared 模块

在 `shared` crate 中新增 3 个模块：

| 模块 | 职责 | 依赖 |
|------|------|------|
| `constants` | 编译期常量（metadata key、NATS subject、服务名、分页、校验规则、Consul） | 无 |
| `convert` | Proto ↔ Model 转换（`datetime_to_timestamp`、`user_model_to_proto`、`article_model_to_proto`） | `proto` + `entity` |
| `extract` | gRPC 请求提取工具（`extract_user_id`、`try_extract_user_id`、`parse_uuid`、`db_unavailable`、`db_error`） | `tonic` + `sea-orm` |

### 2.2 硬编码治理分级

| 优先级 | 处理方式 | 结果 |
|--------|---------|------|
| P0 安全 | `DATABASE_URL`/`JWT_SECRET` → `expect()` fail-fast | ✅ 已实施 |
| P0 安全 | CORS → `CORS_ALLOWED_ORIGINS` 环境变量可配白名单 | ✅ 已实施 |
| P1 运维 | NATS subject/服务名/metadata key → `shared::constants` | ✅ 已实施 |
| P2 业务 | 分页默认值/校验规则/bcrypt cost → `shared::constants` | ✅ 已实施 |

### 2.3 Gateway inject_user_id 语义统一

| 接口类型 | 之前行为 | 之后行为 |
|----------|---------|---------|
| 需认证（CreateArticle、DeleteComment 等） | article/user: 强制认证；**comment/social: 静默跳过** | **统一强制认证**，缺失 user_id 返回 `Unauthenticated` |
| 可选认证（ListArticles、GetInteraction） | `inject_optional_user_id`（有则传递，无则忽略） | 保持不变 |

### 2.4 Repository 层（svc-user）

引入 `UserRepository` trait + `SeaOrmUserRepository` 实现，为后续 handler 测试和数据层替换做准备。

## 3. 实施清单

### Phase 1: Shared 基础模块 ✅
- 新增 `shared::constants`、`shared::convert`、`shared::extract`

### Phase 2: 硬编码治理 P0 ✅
- `DATABASE_URL`/`JWT_SECRET` fail-fast
- CORS 环境变量白名单

### Phase 3: 硬编码治理 P1/P2 ✅
- 58 处硬编码替换为常量引用

### Phase 4: svc-user Repository 层 ✅
- `UserRepository` trait + `SeaOrmUserRepository`
- handler/service 层改用 `shared::convert`/`shared::extract`

### Phase 5: svc-content 重构 ✅（部分）
- handler/service 层改用 `shared::convert`/`shared::extract`
- Repository trait 待后续补充

### Phase 6: Gateway routes 重构 ✅（部分）
- 创建 `routes/helpers.rs`
- 所有 routes 改用 `shared::constants`
- DTO 集中管理待后续实施

### Phase 7: Gateway inject_user_id 语义统一 ✅
- comment/social 从静默跳过改为强制认证
- social 的 `get_article_interaction` 保持可选认证

### Phase 8: Gateway BFF 聚合 — 待实施
### Phase 9: 收尾验证 ✅

## 4. 决策总结

| 决策 | 选择 | 替代方案 | 理由 |
|------|------|---------|------|
| 常量管理 | 编译期 `const` | 运行时 `env` | metadata key、NATS 前缀几乎不变，零开销 |
| Repository 抽象 | trait + SeaORM 实现 | 直接 struct | 允许 mock 测试，未来可替换 ORM |
| CORS 默认值 | localhost 开发端口 | `AllowOrigin::any()` | 安全 + 开发便利平衡 |
| inject_user_id 语义 | 强制 + 可选两个函数 | 单一函数 + 配置 | 编译时可见的接口语义 |

## 5. 后续计划

- [ ] Gateway DTO 集中管理（`dto/` 目录）— Phase 6 未完成部分
- [ ] 统一 ApiError 格式 — BREAKING 变更，需前端配合
- [ ] svc-content Repository trait
- [ ] Gateway BFF 聚合增强（ListComments、ListFavorites）
- [ ] `shared::config::AppConfig` 激活

## 6. 参考资料

- [OpenSpec Change: backend-shared-refactor](../../openspec/changes/backend-shared-refactor/)
- [Design: backend-shared-refactor](../../openspec/changes/backend-shared-refactor/design.md)
