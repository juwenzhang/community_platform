## Context

平台需要 AI 能力来提升内容质量和用户体验。通过 LLM 自动生成摘要、提取标签、估算阅读时间。

LLM 调用方式：使用 OpenAI-compatible API（支持 OpenAI/DeepSeek/本地模型等），通过 HTTP REST 调用。

## Goals / Non-Goals

**Goals:**

1. AI 摘要生成（LLM 异步调用）
2. 自动标签提取（LLM）
3. 阅读时间估算（规则引擎）
4. 相关文章推荐（标签 + TF-IDF）

**Non-Goals:**

- 向量检索/RAG、AI 对话、多语言、AI 改写

## Decisions

### Decision 1: AI 服务架构

两种方案：

| 方案 | 说明 |
|------|------|
| **A: 独立 svc-ai** | 独立微服务，专注 AI 能力，可被多个服务调用 |
| B: 集成到 svc-content | 作为 worker 模块，减少服务数量 |

选择 **方案 A: 独立 svc-ai**：AI 能力可能被多个服务使用（文章摘要、评论审核、搜索增强等），独立服务更灵活。

### Decision 2: 异步处理流程

```
文章保存 → svc-content → NATS publish (article.created/updated)
                              ↓
                         svc-ai worker 订阅
                              ↓
                    1. 提取纯文本（使用 article_ast.plain_text）
                    2. 并行调用 LLM（摘要 + 标签）
                    3. 计算阅读时间（规则引擎）
                    4. 更新 articles 表（summary + tags）
```

不阻塞文章保存流程，通过 NATS 异步处理。

### Decision 3: LLM 调用设计

```rust
// services/svc-ai/src/llm/mod.rs
pub struct LlmClient {
    api_key: String,
    base_url: String,  // OpenAI-compatible API endpoint
    model: String,     // e.g., "deepseek-chat", "gpt-4o-mini"
    client: reqwest::Client,
}

impl LlmClient {
    pub async fn generate_summary(&self, text: &str) -> Result<String> {
        let prompt = format!("请为以下技术文章生成 200 字以内的中文摘要，要求客观准确、突出重点：\n\n{}", text);
        self.chat(&prompt).await
    }

    pub async fn extract_tags(&self, text: &str) -> Result<Vec<String>> {
        let prompt = format!("从以下技术文章中提取 3-5 个最相关的标签（返回 JSON 数组格式）：\n\n{}", text);
        // parse JSON response
    }
}
```

### Decision 4: 阅读时间估算

```rust
fn estimate_reading_time(content: &str) -> u32 {
    let chinese_chars = content.chars().filter(|c| c.is_cjk()).count();
    let english_words = content.split_whitespace()
        .filter(|w| w.chars().all(|c| c.is_ascii()))
        .count();
    
    let minutes = (chinese_chars as f64 / 400.0) + (english_words as f64 / 200.0);
    minutes.ceil() as u32
}
```

### Decision 5: 相关文章推荐

```rust
fn find_related_articles(article_id: Uuid, tags: &[String], limit: usize) -> Vec<Article> {
    // 1. 标签匹配：找到共享标签最多的文章
    // 2. TF-IDF 相似度：使用 article_ast.plain_text 计算余弦相似度
    // 3. 加权排序：标签权重 0.6 + 文本相似度权重 0.4
    // 4. 排除自身 + 已阅读文章
}
```

**与 rag-plugin-system 的关系**：当前使用标签 + TF-IDF 推荐是基础方案，未来可升级为向量检索（见 `rag-plugin-system` change）。

### Decision 6: LLM API 降级策略

**问题**：LLM API 可能因配额、网络、服务商故障而不可用。

**降级方案**：

| 降级级别 | 触发条件 | 行为 |
|----------|---------|------|
| **正常** | API 正常响应 | 生成 AI 摘要和标签 |
| **降级** | API 超时/错误 > 3 次 | 使用规则引擎生成简单摘要（前 200 字） |
| **熔断** | API 错误率 > 50% | 跳过 AI 处理，文章正常保存 |

**实现**：

```rust
// services/svc-ai/src/circuit_breaker.rs
pub struct LlmCircuitBreaker {
    failure_count: AtomicU32,
    last_failure_time: AtomicI64,
    state: AtomicU8, // 0: Closed, 1: Open, 2: HalfOpen
}

impl LlmCircuitBreaker {
    pub async fn call_with_fallback<F, T>(&self, f: F) -> Result<T>
    where
        F: Future<Output = Result<T>>,
    {
        match self.state.load(Ordering::Relaxed) {
            0 => {
                match f.await {
                    Ok(result) => {
                        self.failure_count.store(0, Ordering::Relaxed);
                        Ok(result)
                    }
                    Err(e) => {
                        let count = self.failure_count.fetch_add(1, Ordering::Relaxed);
                        if count >= 3 {
                            self.state.store(1, Ordering::Relaxed);
                            self.last_failure_time.store(now(), Ordering::Relaxed);
                        }
                        self.fallback()
                    }
                }
            }
            1 | 2 => self.fallback(),
            _ => unreachable!(),
        }
    }
    
    fn fallback<T>(&self) -> Result<T> {
        // 返回降级结果
        Ok(generate_simple_summary())
    }
}
```

### Decision 7: Prompt 版本管理

**问题**：Prompt 需要迭代优化，需要版本管理。

**方案**：将 Prompt 存储在数据库中，支持版本切换。

```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,        -- 'summary', 'tags', etc.
  version INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  
  UNIQUE(name, version)
);

-- 示例数据
INSERT INTO ai_prompts (id, name, version, content, is_active) VALUES
('...', 'summary', 1, '请为以下技术文章生成 200 字以内的中文摘要...', true),
('...', 'summary', 2, '请总结以下文章的核心观点，控制在 150 字以内...', false);
```

```rust
// services/svc-ai/src/prompts/mod.rs
pub struct PromptManager {
    db: Database,
    cache: LruCache<String, String>,
}

impl PromptManager {
    pub async fn get_active_prompt(&self, name: &str) -> Result<String> {
        if let Some(prompt) = self.cache.get(name) {
            return Ok(prompt.clone());
        }
        
        let prompt = sqlx::query!(
            "SELECT content FROM ai_prompts WHERE name = $1 AND is_active = true",
            name
        )
        .fetch_one(&self.db)
        .await?;
        
        self.cache.put(name.to_string(), prompt.content.clone());
        Ok(prompt.content)
    }
}
```

### Decision 8: 成本估算与控制

**LLM 成本估算**：

| 方案 | 部署方式 | 成本 | 备注 |
|------|---------|------|------|
| **Ollama + Qwen2.5-7B** | 本地部署 | **零成本** | 需要 GPU（8GB 显存） |
| **Ollama + Qwen2.5-72B** | 本地部署 | **零成本** | 需要 GPU（80GB 显存） |
| DeepSeek API | 云服务 | ¥0.001/1K tokens | 商业服务，有成本 |
| GPT-4o API | 云服务 | $0.15/1M tokens | 商业服务，成本高 |

**推荐配置**：
- **开发环境**：Qwen2.5-7B（单张 RTX 3080/4090 即可）
- **生产环境**：Qwen2.5-72B（需多卡并行或云 GPU）

**成本控制策略**：

| 策略 | 说明 |
|------|------|
| **内容长度限制** | 超过 10,000 字的文章只处理前 5,000 字 |
| **缓存** | 相同内容的摘要缓存 30 天（Redis） |
| **配额管理** | 每个用户每天最多生成 10 篇文章的摘要 |
| **批量处理** | 低峰期批量生成摘要，避免高峰期 GPU 资源竞争 |

**GPU 资源规划**：

| 场景 | GPU 配置 | 并发能力 |
|------|---------|---------|
| **小型社区** | RTX 4090 (24GB) | 3-5 并发 |
| **中型社区** | A100 40GB | 10-15 并发 |
| **大型社区** | A100 80GB × 2 | 30-50 并发 |

```rust
// services/svc-ai/src/quota.rs
pub async fn check_quota(user_id: &str, redis: &RedisClient) -> Result<bool> {
    let key = format!("luhanxin:ai_quota:{}", user_id);
    let count = redis.incr(&key).await?;
    
    if count == 1 {
        redis.expire(&key, 86400).await?; // 24 小时窗口
    }
    
    Ok(count <= 10)
}
```
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| LLM API 延迟 | 摘要生成 2-10s | 异步处理，不阻塞 |
| LLM API 成本 | 每篇文章调用 2 次 LLM | 速率限制 + 短文章不调用 |
| 摘要质量 | LLM 可能生成不准确摘要 | Prompt 优化 + 人工可编辑 |
| 相关推荐质量 | TF-IDF 不如向量检索 | 后续 RAG change 升级为向量检索 |

## Open Questions（已解决）

1. **使用哪个 LLM 模型？**
   - ✅ 选择：**Ollama + DeepSeek/Qwen（开源免费，本地部署）**
   - 理由：完全开源免费，数据隐私，无 API 依赖，支持中文
   - 实现方案：
     - **主力模型**：Qwen2.5-7B（阿里开源，中文效果好，7B 参数平衡性能）
     - **备选模型**：DeepSeek-V3-7B（中国开源，推理能力强）
     - **高性能模型**：Qwen2.5-72B（如需高质量摘要，GPU 资源充足时）
   - 部署方式：
     ```bash
     # 安装 Ollama
     curl -fsSL https://ollama.com/install.sh | sh
     
     # 下载模型
     ollama pull qwen2.5:7b
     
     # API 调用
     curl http://localhost:11434/api/generate -d '{
       "model": "qwen2.5:7b",
       "prompt": "请为以下技术文章生成 200 字以内的中文摘要..."
     }'
     ```
   - 成本：**零成本**（只需 GPU 资源，无需 API 费用）

2. **摘要是否需要人工审核后再发布？**
   - ✅ 选择：**不需要审核，自动发布，人工可干预**
   - 理由：自动化程度高，提升效率；管理员可在后台删除/修改不当摘要

3. **是否支持用户自定义 AI Prompt？**
   - ✅ 选择：**不支持初期，未来可扩展**
   - 理由：避免滥用，维护成本高；初期使用平台统一 Prompt，确保质量

4. **LLM 调用失败时的降级策略？**
   - ✅ 已在 Decision 6（LLM API 降级策略）中解决
   - 正常 → 降级（规则引擎）→ 熔断（跳过 AI）三阶段降级
