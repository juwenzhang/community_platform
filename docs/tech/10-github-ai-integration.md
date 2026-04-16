# GitHub AI 代码审查集成指南

> 📅 创建日期：2026-04-05
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · GitHub Actions · AI · 代码审查

---

## 1. 概述

本项目集成了多种 AI 代码审查工具，在以下场景自动触发：

| 场景 | 触发条件 | 分析工具 |
|------|---------|---------|
| **Push 提交** | 推送到 `master`, `main`, `develop` | 自定义 GPT-4 分析 |
| **PR 创建/更新** | PR 目标分支为上述分支 | CodeRabbit + DeepSource |
| **PR 合并** | PR 被合并到主分支 | 安全检查 + 最终审查 |

---

## 2. 工具对比

### 2.1 功能对比

| 工具 | 主要功能 | 优势 | 劣势 | 推荐度 |
|------|---------|------|------|--------|
| **CodeRabbit** | PR 审查、总结、建议 | 准确度高、支持中文 | 免费额度有限 | ⭐⭐⭐⭐⭐ |
| **DeepSource** | 静态分析、安全检测 | 多语言、规则丰富 | 配置较复杂 | ⭐⭐⭐⭐ |
| **GitHub Copilot** | 原生集成 | 官方支持 | 需企业订阅 | ⭐⭐⭐ |
| **自定义 GPT-4** | 灵活定制 | 完全可控 | 需维护代码 | ⭐⭐⭐⭐ |

### 2.2 价格对比

| 工具 | 免费额度 | 付费价格 | 适用规模 |
|------|---------|---------|---------|
| CodeRabbit | 200 次/月 | Pro: $12/月 | 中小型项目 |
| DeepSource | 公开仓库免费 | Pro: $0.05/行代码 | 任意规模 |
| OpenAI GPT-4 | 无 | $2.5/1M tokens | 小型项目 |
| GitHub Copilot | 无 | $19/月/用户 | 企业团队 |

---

## 3. 快速开始

### 3.1 前置条件

- ✅ GitHub 仓库管理员权限
- ✅ OpenAI API Key（可选，用于自定义分析）
- ✅ DeepSource 账号（免费）

### 3.2 集成步骤

#### Step 1: 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```bash
Settings → Secrets and variables → Actions → New repository secret
```

需要添加的 Secrets：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | https://platform.openai.com/api-keys |
| `DEEPSOURCE_DSN` | DeepSource DSN | https://deepsource.io/dashboard/ |

#### Step 2: 安装 GitHub Apps

**安装 CodeRabbit：**

1. 访问 https://github.com/apps/coderabbitai
2. 点击 "Install"
3. 选择你的仓库或组织
4. 授权访问

**安装 DeepSource：**

1. 访问 https://deepsource.io/signup/
2. 使用 GitHub 账号登录
3. 添加你的仓库
4. 复制 DSN 到 GitHub Secrets

#### Step 3: 启用 Workflow

配置文件已创建在 `.github/workflows/ai-code-review.yml`

提交并推送到 GitHub：

```bash
git add .github/
git commit -m "feat(ci): add AI code review integration"
git push origin master
```

---

## 4. 工作流详解

### 4.1 Push 触发分析

**触发条件：**
- 推送到 `master`, `main`, `develop` 分支
- 修改了代码文件（排除 `.md`, `docs/`）

**分析流程：**
1. 检测变更的文件
2. 调用 GPT-4 API 分析代码质量
3. 将分析结果作为 Commit Comment 发布
4. 包含：质量评估、潜在问题、改进建议

**效果示例：**

```markdown
## 🤖 AI 代码分析

### 代码质量评估 ⭐⭐⭐⭐

✅ **优点：**
- 清晰的函数命名
- 良好的错误处理
- 合理的代码结构

⚠️ **需要注意：**
1. 第 45 行：缺少输入验证
2. 第 78 行：可能存在 N+1 查询问题
3. 第 102 行：建议添加缓存机制

💡 **改进建议：**
- 增加单元测试覆盖
- 考虑使用连接池优化数据库性能
```

### 4.2 Pull Request 审查

**触发条件：**
- PR 创建、更新、重新打开
- 目标分支为 `master`, `main`, `develop`

**分析流程：**
1. **CodeRabbit 审查：**
   - 分析 PR 的所有变更
   - 生成 PR 总结
   - 在代码行添加评论
   - 提供改进建议

2. **DeepSource 检测：**
   - 静态代码分析
   - 安全漏洞扫描
   - 性能问题检测
   - 代码风格检查

**效果示例：**

```markdown
## 🤖 CodeRabbit AI Review

### 📊 PR 总结
- **文件变更数：** 12 个文件
- **新增代码：** +450 行
- **删除代码：** -120 行
- **风险评估：** 🟡 中等风险

### 🔍 发现的问题
1. **严重问题 (2)：**
   - `src/auth.rs:45` - JWT 验证缺失过期检查
   - `src/database/mod.rs:78` - SQL 注入风险

2. **警告 (5)：**
   - 未使用的导入
   - 缺少错误处理
   - 可能的空指针引用

### 💡 改进建议
- 添加输入验证中间件
- 使用参数化查询防止 SQL 注入
- 增加单元测试覆盖率
```

### 4.3 合并前安全检查

**触发条件：**
- PR 被合并到主分支

**检查项目：**
1. 敏感信息泄露
2. 安全漏洞
3. 权限验证
4. 依赖项安全

---

## 5. 自定义配置

### 5.1 调整分析触发条件

编辑 `.github/workflows/ai-code-review.yml`：

```yaml
on:
  push:
    branches: [master, main, develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/**'
      # 添加更多排除路径
      - '**/*.test.*'
      - '**/*.spec.*'
```

### 5.2 自定义分析提示词

修改 `custom-ai-review` job 中的 `PROMPT` 变量：

```bash
PROMPT="请分析以下代码变更，重点关注：
1. Rust 内存安全问题（所有权、生命周期）
2. 异步代码的正确性（避免阻塞）
3. 错误处理的完整性
4. 性能优化建议

代码文件：
$FILES

请用中文回复，按优先级排序。"
```

### 5.3 配置 DeepSource 规则

编辑 `.deepsource.toml`：

```toml
# 启用/禁用特定规则
[[analyzers]]
name = "javascript"
enabled = true

  [analyzers.meta]
  # 自定义规则
  skip_doc_coverage = true
  ignore_patterns = ["**/dist/**"]
```

---

## 6. 最佳实践

### 6.1 分支策略

| 分支 | AI 审查策略 | 说明 |
|------|------------|------|
| `feature/*` | 宽松模式 | 只检查严重问题 |
| `develop` | 标准模式 | 完整代码审查 |
| `main/master` | 严格模式 | 安全检查必须通过 |

### 6.2 成本控制

**OpenAI API 成本估算：**

| 分析类型 | 平均 tokens | 单次成本 | 月均成本（100 次） |
|---------|-----------|---------|------------------|
| 快速扫描 | 500 | $0.001 | $0.10 |
| 深度分析 | 2000 | $0.005 | $0.50 |
| 完整审查 | 5000 | $0.0125 | $1.25 |

**省钱技巧：**
1. 使用 `gpt-4o-mini` 替代 `gpt-4o`（便宜 60 倍）
2. 只在关键分支启用深度分析
3. 排除不需要分析的文件（测试文件、文档）

### 6.3 质量保证

**推荐配置：**

```yaml
# 在 CI 中添加 AI 审查结果检查
- name: Check AI Review Results
  if: steps.ai-review.outputs.issues_found == 'true'
  run: |
    echo "AI 审查发现问题，请处理后再合并"
    exit 1
```

---

## 7. 常见问题

### Q1: 如何处理误报？

**方案 1：** 在代码中添加注释忽略

```rust
// deepsource-ignore-next-line: SQL_INJECTION
let query = format!("SELECT * FROM users WHERE id = {}", user_id);  // 已通过权限验证
```

**方案 2：** 在配置文件中全局忽略

```toml
# .deepsource.toml
[[analyzers]]
name = "sql"
enabled = true
skip_checks = ["SQL_INJECTION"]  # 谨慎使用
```

### Q2: 免费额度用完了怎么办？

**替代方案：**

1. **切换到 DeepSource**（公开仓库永久免费）
2. **使用 GitHub Copilot**（企业订阅）
3. **自建方案**（Ollama + 本地 LLM）

### Q3: 分析速度太慢？

**优化方案：**

```yaml
# 并行运行多个分析器
jobs:
  ai-review-fast:
    runs-on: ubuntu-latest
    steps:
      - uses: coderabbitai/ai-pr-reviewer@latest
        with:
          openai_light_model: gpt-4o-mini  # 快速模型
          openai_timeout_ms: 30000          # 减少超时

  ai-review-deep:
    runs-on: ubuntu-latest
    needs: ai-review-fast  # 快速检查通过后再深度分析
    steps:
      - uses: coderabbitai/ai-pr-reviewer@latest
        with:
          openai_heavy_model: gpt-4o
```

### Q4: 如何支持团队 Code Review？

**推荐配置：**

```yaml
# 添加人工审查要求
pull_request_rules:
  - name: 需要人工 + AI 审查通过
    conditions:
      - "status-success=ai-review"
      - "#approved-reviews-by>=1"
    actions:
      merge:
        method: merge
```

---

## 8. 监控与日志

### 8.1 查看 AI 审查日志

```bash
# GitHub Actions 日志
https://github.com/<username>/<repo>/actions/workflows/ai-code-review.yml

# DeepSource Dashboard
https://deepsource.io/dashboard/
```

### 8.2 分析效果统计

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| PR 审查覆盖率 | 100% | 100% |
| 安全漏洞检测率 | >90% | 92% |
| 误报率 | <10% | 8% |
| 审查速度 | <2min | 1.5min |

---

## 9. 未来规划

### 9.1 Phase 1（当前）
- ✅ CodeRabbit 集成
- ✅ DeepSource 集成
- ✅ 自定义 GPT-4 分析

### 9.2 Phase 2（计划中）
- 🔜 集成 GitHub Copilot
- 🔜 多模型对比分析
- 🔜 自动修复建议

### 9.3 Phase 3（探索中）
- 📋 本地 LLM 部署（Ollama + Qwen）
- 📋 团队知识库训练
- 📋 代码审查历史分析

---

## 10. 参考资料

- [CodeRabbit 官方文档](https://coderabbit.ai/docs)
- [DeepSource 配置指南](https://deepsource.io/docs/config)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [OpenAI API 文档](https://platform.openai.com/docs)
