---
name: complete-openspec-proposals
overview: 完成两个 OpenSpec Change 的剩余文档：Change 1 需要 1 个 delta spec + tasks.md，Change 2 需要 5 个 spec 文件 + tasks.md，共 8 个文件。
todos:
  - id: change1-header-spec
    content: 创建 Change 1 的 specs/header-user-menu/spec.md（MODIFIED delta — Header 新增通知铃铛 NotificationBell 组件）
    status: completed
  - id: change1-tasks
    content: 创建 Change 1 的 tasks.md，使用 [skill:openspec-continue-change] 获取 tasks instructions 并按依赖链拆分任务
    status: completed
    dependencies:
      - change1-header-spec
  - id: change2-specs
    content: 创建 Change 2 的全部 5 个 spec 文件（image-upload、dark-mode、header-user-menu、gateway-connect-protocol、frontend-auth）
    status: completed
  - id: change2-tasks
    content: 创建 Change 2 的 tasks.md，按编辑入口修复、图片上传、暗黑模式三条线拆分任务
    status: completed
    dependencies:
      - change2-specs
  - id: verify-status
    content: 执行 openspec status 验证两个 Change 的所有 artifacts 状态为 done，展示最终状态供用户审阅
    status: completed
    dependencies:
      - change1-tasks
      - change2-tasks
---

## 用户需求

完成两个 OpenSpec Change 的全部文档（specs + tasks），以便用户审阅后决定先实施哪个。

## 产品概述

为 Luhanxin Community Platform 准备两个功能迭代的完整 OpenSpec 提案文档：

- **Change 1 — 社区互动增强**：通知系统 + 全文搜索（Meilisearch） + Redis 缓存层
- **Change 2 — 用户体验优化**：修复编辑资料入口 + 图片上传（头像） + 暗黑模式

## 核心内容

上一轮对话已完成两个 Change 的 proposal.md、design.md 及 Change 1 的 6 个 spec 文件。本次需要补齐：

**Change 1 剩余文件 (2个)**:

1. `specs/header-user-menu/spec.md` — Header 新增通知铃铛组件的 delta spec
2. `tasks.md` — 实施任务拆分（Proto -> Redis -> svc-notification -> NATS 事件 -> Gateway -> 前端）

**Change 2 全部文件 (6个)**:

1. `specs/image-upload/spec.md` — 图片上传服务 spec
2. `specs/dark-mode/spec.md` — 暗黑模式 spec
3. `specs/header-user-menu/spec.md` — 菜单修复 + 主题切换按钮 delta spec
4. `specs/gateway-connect-protocol/spec.md` — 文件上传 REST 端点 delta spec
5. `specs/frontend-auth/spec.md` — 编辑资料路由守卫 delta spec
6. `tasks.md` — 实施任务拆分

## 技术栈

- 文档格式：OpenSpec Markdown（proposal / design / specs / tasks）
- 工作流工具：OpenSpec CLI（`npx openspec status`、`npx openspec instructions`）
- Spec 格式规范：ADDED/MODIFIED Requirements + `### Requirement:` + `#### Scenario:` + WHEN/THEN

## 实现方案

本次任务是纯文档创建工作，需要严格遵循 OpenSpec spec-driven schema 的 artifact 格式：

1. **Spec 文件**：按 proposal 中 Capabilities 列出的每个 capability 创建对应 spec 文件

- New Capabilities -> `## ADDED Requirements`
- Modified Capabilities -> `## MODIFIED Requirements`（需包含完整的 requirement 原文 + 修改内容）
- 每个 Requirement 必须有至少一个 Scenario（`#### Scenario:`，4 个 `#`）
- 使用 SHALL/MUST 规范性用语

2. **Tasks 文件**：按 design 文档中的依赖链拆分实施任务

- 每个任务 1-3h 可完成
- Proto 定义任务最优先
- 标注依赖关系

## 实现注意事项

- Spec 文件中的 MODIFIED Requirements 必须包含完整的 requirement 块（从 `### Requirement:` 到所有 scenarios），不能只写 diff
- Change 1 的 header-user-menu delta spec 只需添加通知铃铛相关需求（编辑资料入口已在现有 spec 中定义）
- Change 2 的 header-user-menu delta spec 需要修复"编辑资料"入口缺失 + 添加主题切换按钮
- 两个 Change 的 tasks.md 需要互相独立，不存在跨 Change 依赖

## 目录结构

```
openspec/changes/
  community-interaction-enhancement/
    specs/
      header-user-menu/
        spec.md              # [NEW] MODIFIED delta — 通知铃铛组件
    tasks.md                 # [NEW] 实施任务拆分
  user-experience-optimization/
    specs/
      image-upload/
        spec.md              # [NEW] ADDED — 图片上传服务
      dark-mode/
        spec.md              # [NEW] ADDED — 暗黑模式
      header-user-menu/
        spec.md              # [NEW] MODIFIED delta — 编辑资料入口 + 主题切换
      gateway-connect-protocol/
        spec.md              # [NEW] MODIFIED delta — REST 文件上传端点
      frontend-auth/
        spec.md              # [NEW] MODIFIED delta — 编辑资料路由守卫
    tasks.md                 # [NEW] 实施任务拆分
```

## Agent Extensions

### Skill

- **openspec-continue-change**
- Purpose: 按 OpenSpec 工作流推进 artifact 创建，获取 instructions 和 template
- Expected outcome: 获取每个 artifact 的模板、规则和依赖信息，确保格式正确

### SubAgent

- **code-explorer**
- Purpose: 批量读取已有的 spec 文件和 design 文档内容作为创建新文件的上下文
- Expected outcome: 获取准确的现有 spec 原文，确保 MODIFIED delta spec 包含完整的 requirement 块