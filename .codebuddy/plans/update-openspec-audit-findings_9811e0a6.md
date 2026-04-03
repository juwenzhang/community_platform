---
name: update-openspec-audit-findings
overview: 根据自审报告发现的 5 个问题，更新 backend-shared-refactor 的 design.md 和 tasks.md 文档，使设计文档与实际代码库完全一致。
todos:
  - id: update-design-decision3
    content: 修改 design.md Decision 3：补全 status_to_response 映射、标注 ApiError 全面 BREAKING、添加 build_metadata 白名单策略说明
    status: completed
  - id: update-design-decision6
    content: 修改 design.md Decision 6：补充 REST 层认证双路径问题及统一方案说明
    status: completed
  - id: update-tasks-phase6
    content: 修改 tasks.md Phase 6：新增任务 6.0（前端 ApiError 消费点清单），补充 6.3/6.6/6.8 任务描述
    status: completed
---

## 用户需求

根据代码审计发现的 5 个问题，更新 `backend-shared-refactor` 的 OpenSpec 设计文档（`design.md` 和 `tasks.md`），使设计文档更准确地反映实际代码现状和目标方案。

## 核心更新内容

### design.md 更新（4 处）

1. **Decision 3 — `status_to_response()` 补全状态码映射**：从现有 `user/mod.rs` 的实现中补全 `AlreadyExists`(409)、`DeadlineExceeded`(504)、`ResourceExhausted`(429) 三个映射
2. **Decision 3 — ApiError 全面 BREAKING 标注**：在 `ApiError` 定义处增加注释，说明当前 4 个路由模块的不同格式（user 用 `{code:u32, message}`，其他三个用 `{error}`），统一为 `{code:String, message}` 是第三种格式，对所有路由均为 BREAKING
3. **Decision 3 — `build_metadata()` 白名单策略**：说明从 `user/mod.rs` 的全量克隆 `headers_to_metadata()` 改为白名单转发（`authorization` + `x-request-id`）的设计决策
4. **Decision 6 — REST 层认证双路径问题**：补充说明当前存在两条认证路径（REST 直连模式 vs gRPC service 透传模式），以及统一方案

### tasks.md 更新（4 处）

5. **Phase 6 新增任务 6.0**：收集前端 ApiError 消费点清单（因为是全面 BREAKING 变更）
6. **任务 6.3 补充**：明确 `ArticleDto.author` 的 `super::super` 路径修复为 `crate::dto::user::UserDto`
7. **任务 6.6 补充**：说明 `build_metadata()` 采用白名单策略，替换 `user/mod.rs` 的 `headers_to_metadata()` 全量克隆
8. **任务 6.8 补充**：明确 user 路由的 `headers_to_metadata()` 和 `status_to_response()` 迁移

## 技术栈

- 纯文档修改（Markdown 文件），不涉及代码变更
- 修改目标：`openspec/changes/backend-shared-refactor/design.md` 和 `tasks.md`

## 实现方案

本次是对已有 OpenSpec 设计文档的审计修正，基于代码审计发现的 5 个不精确/遗漏点进行补充。修改均为 Markdown 文本编辑，需要精确定位到文档中的具体行区域进行插入或替换。

### 关键修改策略

1. **design.md 修改保持结构不变** — 所有修改均在现有 Decision 3 和 Decision 6 的框架内进行，不新增 Decision
2. **`status_to_response()` 以现有代码为基础** — 参考 `routes/user/mod.rs` L202-222 的完整映射，补全 `AlreadyExists`、`DeadlineExceeded`、`ResourceExhausted`
3. **ApiError BREAKING 说明** — 在代码注释和文字描述中同时标注，确保实施时不遗漏前端配合
4. **`build_metadata()` 白名单策略** — 补充 `x-request-id` 转发，并添加设计决策说明（为什么不全量克隆）
5. **tasks.md 新增任务编号连续** — 新增 6.0 不影响后续编号（6.1-6.11 保持不变）

## 目录结构

```
openspec/changes/backend-shared-refactor/
├── design.md    # [MODIFY] 修改 Decision 3（3 处）和 Decision 6（1 处）
└── tasks.md     # [MODIFY] Phase 6 新增 6.0，修改 6.3、6.6、6.8 任务描述
```

## 实施注意

- 修改 `status_to_response()` 代码块时，保持与 `user/mod.rs` 现有实现的映射一致
- `ApiError` BREAKING 说明需要同步更新 `Risks / Trade-offs` 表格（已有条目可强化措辞）
- `build_metadata()` 新增 `x-request-id` 转发时，确保引用 `shared::constants::METADATA_REQUEST_ID`

## Agent Extensions

### Skill

- **openspec-apply-change**
- 用途：实施 OpenSpec change 中的任务，用于更新 design.md 和 tasks.md
- 预期结果：两份文档按审计发现精确更新，保持文档内部一致性