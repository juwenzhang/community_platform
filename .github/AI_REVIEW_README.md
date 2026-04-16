# 🤖 AI Code Review - 快速开始

## 一键配置

```bash
# 运行配置脚本
bash scripts/setup-ai-review.sh
```

## 手动配置（3 步完成）

### Step 1: 获取 API Keys

| 服务 | 获取链接 | 免费额度 |
|------|---------|---------|
| **OpenAI** | https://platform.openai.com/api-keys | 无（按使用付费） |
| **DeepSource** | https://deepsource.io/dashboard/ | 公开仓库免费 |
| **CodeRabbit** | https://github.com/apps/coderabbitai | 200 次/月 |

### Step 2: 设置 GitHub Secrets

```bash
# 方式 1: 使用 gh CLI
gh secret set OPENAI_API_KEY --body "sk-..." --repo <username>/<repo>
gh secret set DEEPSOURCE_DSN --body "..." --repo <username>/<repo>

# 方式 2: 在 GitHub 网页设置
# Settings → Secrets and variables → Actions → New repository secret
```

### Step 3: 提交配置文件

```bash
git add .github/ .deepsource.toml
git commit -m "feat(ci): add AI code review integration"
git push origin master
```

## 验证配置

### 创建测试 PR

```bash
# 创建测试分支
git checkout -b test-ai-review

# 修改一些代码
echo "// test" >> src/main.rs

# 提交并推送
git add .
git commit -m "test: AI review test"
git push origin test-ai-review

# 在 GitHub 创建 PR，观察 AI 分析结果
```

### 查看 Actions 运行状态

```
https://github.com/<username>/<repo>/actions/workflows/ai-code-review.yml
```

## 成本估算

### 月度成本（小型项目，~100 PRs）

| 服务 | 使用量 | 成本 |
|------|--------|------|
| CodeRabbit | 100 次 | **$0**（免费额度内） |
| DeepSource | 公开仓库 | **$0** |
| OpenAI API | ~100K tokens | ~$0.25 |
| **总计** | - | **~$0.25/月** |

### 中型项目（~500 PRs）

| 服务 | 使用量 | 成本 |
|------|--------|------|
| CodeRabbit | 500 次 | $12（需升级 Pro） |
| DeepSource | 私有仓库 | $5 |
| OpenAI API | ~500K tokens | ~$1.25 |
| **总计** | - | **~$18.25/月** |

## 常见问题

### Q: 免费额度用完了怎么办？

**A:** 切换到以下方案：
1. **DeepSource**（公开仓库永久免费）
2. **GitHub Copilot**（企业订阅 $19/月）
3. **自建 Ollama + Qwen**（完全免费，需本地部署）

### Q: 分析速度太慢？

**A:** 在 `.github/workflows/ai-code-review.yml` 中调整：

```yaml
with:
  openai_light_model: gpt-4o-mini  # 快速模型
  openai_timeout_ms: 30000          # 减少超时
```

### Q: 如何跳过某些文件的分析？

**A:** 在 `paths-ignore` 中添加：

```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - '**/*.test.*'
```

## 更多资源

- 📚 [完整配置指南](./docs/tech/10-github-ai-integration.md)
- 🔧 [DeepSource 配置](./.deepsource.toml)
- 🚀 [工作流定义](./.github/workflows/ai-code-review.yml)

---

**💡 提示**：首次使用建议先用测试分支验证配置是否正确，避免影响主分支开发流程。
