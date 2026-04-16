## Context

当前评论系统前端组件位于 `apps/main/src/pages/post/pages/detail/` 中（嵌套在文章详情页），后端在 `services/svc-content/handlers/comment/`。评论使用二级嵌套结构，通过 `parent_id` 关联。

Proto 定义在 `proto/luhanxin/community/v1/comment.proto`，已有 `ListComments` RPC，使用 offset-based 分页。

## Goals / Non-Goals

**Goals:**

1. 评论列表无限滚动 + 骨架屏
2. 评论排序（最新/最热）
3. 乐观点赞体验
4. 评论 Markdown 渲染
5. @提及跳转链接
6. 文章列表评论数量预览

**Non-Goals:**

- 三级嵌套
- 评论审核
- 评论富媒体上传
- 评论 Markdown 编辑器

## Decisions

### Decision 1: 无限滚动方案

使用 `IntersectionObserver` + 游标分页（cursor-based），替代当前的 offset 分页。

```typescript
// 游标分页请求
interface ListCommentsRequest {
  article_id: string;
  page_size: number;
  cursor?: string;  // 基于时间戳的游标
  sort: 'latest' | 'popular';
}
```

后端游标方案：使用 `created_at` 或 `(like_count, created_at)` 作为游标。

### Decision 2: 排序实现

| 排序 | SQL | 说明 |
|------|-----|------|
| 最新 | `ORDER BY created_at DESC` | 默认 |
| 最热 | `ORDER BY like_count DESC, created_at DESC` | 24h 内点赞权重更高 |

Proto 新增：
```protobuf
enum CommentSort {
  COMMENT_SORT_LATEST = 0;
  COMMENT_SORT_POPULAR = 1;
}

message ListCommentsRequest {
  // ...existing fields...
  CommentSort sort = 5;
  string cursor = 6;  // 游标分页
}
```

### Decision 3: 乐观点赞

```typescript
// 乐观更新流程
function handleLike(commentId: string) {
  // 1. 立即更新 UI（无需等待 API）
  setComments(prev => toggleLike(prev, commentId));
  // 2. 后台发送请求
  likeComment(commentId).catch(() => {
    // 3. 失败时回滚
    setComments(prev => toggleLike(prev, commentId));
  });
}
```

### Decision 4: 评论 Markdown 渲染

评论使用 `@luhanxin/md-parser` 的简化渲染模式：
- 支持 GFM 基础语法（加粗、斜体、代码块、链接、列表）
- 不加载 Mermaid/KaTeX/自定义语法（减少评论区域包体积）
- XSS 防护使用 md-parser 内置的 sanitize

### Decision 5: 文章评论数量预览

Proto 修改：
```protobuf
message Article {
  // ...existing fields...
  int32 comment_count = 16;  // 新增评论数量
}
```

后端在文章列表查询时 JOIN comments 表统计数量（或使用 Redis 缓存）。

### Decision 6: 子评论折叠策略

**问题**：热门评论可能有数百条子评论，全量加载影响性能。

**折叠策略**：

| 规则 | 折叠行为 |
|------|---------|
| 子评论 ≤ 3 条 | 全部展开 |
| 子评论 4-10 条 | 显示前 2 条 + "展开查看 X 条回复" |
| 子评论 > 10 条 | 显示前 2 条 + "展开查看 X 条回复" + 分页加载 |

**实现**：

```typescript
interface CommentWithReplies {
  id: string;
  content: string;
  replies: Comment[];
  reply_count: number;     // 总回复数
  visible_replies: number; // 当前显示的回复数
  has_more: boolean;       // 是否有更多
}

// 前端折叠逻辑
function getVisibleReplies(comment: Comment): Comment[] {
  if (comment.replies.length <= 3) {
    return comment.replies;
  }
  return comment.replies.slice(0, 2); // 只显示前 2 条
}
```

**后端分页加载子评论**：

```protobuf
message ListRepliesRequest {
  string comment_id = 1;
  string cursor = 2;
  int32 page_size = 3;
}
```

### Decision 7: 反垃圾措施

| 措施 | 实现方式 |
|------|---------|
| **频率限制** | 同一用户 1 分钟内最多发表 5 条评论 |
| **内容长度限制** | 评论长度 1-5000 字符 |
| **敏感词过滤** | 使用 DFA 算法检测敏感词，自动替换为 `***` |
| **链接限制** | 评论中最多包含 3 个链接 |
| **举报机制** | 用户可举报评论，管理员审核后删除 |
| **自动标记** | 5 次举报自动隐藏，等待管理员审核 |

**敏感词过滤实现**：

```rust
// services/svc-content/src/utils/sensitive_words.rs
use dfa::DFA;

lazy_static! {
    static ref SENSITIVE_WORDS_DFA: DFA = {
        let words = load_sensitive_words_from_db();
        DFA::new(words)
    };
}

pub fn filter_sensitive_words(content: &str) -> String {
    SENSITIVE_WORDS_DFA.replace_all(content, "***")
}
```

**频率限制实现**：

```rust
// services/gateway/src/middleware/comment_rate_limit.rs
pub async fn check_comment_rate_limit(user_id: &str, redis: &RedisClient) -> Result<()> {
    let key = format!("luhanxin:comment_rate:{}", user_id);
    let count = redis.incr(&key).await?;
    
    if count == 1 {
        redis.expire(&key, 60).await?; // 1 分钟窗口
    }
    
    if count > 5 {
        return Err(ErrorCode::RateLimitExceeded);
    }
    
    Ok(())
}
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 游标分页与嵌套评论冲突 | 嵌套评论的父级可能跨页 | 一级评论游标分页，子评论全量加载 |
| 乐观更新与实际不一致 | 网络差时回滚闪烁 | debounce + 静默重试 |
| 评论 Markdown XSS | 评论内容被注入 | 复用 md-parser sanitize |

## Open Questions（已解决）

1. **评论「最热」排序的时间窗口？**
   - ✅ 选择：**30 天窗口**
   - 理由：平衡时效性和热度，避免旧评论长期霸榜，符合社区活跃度期望

2. **子评论是否也支持无限滚动？**
   - ✅ 选择：**全量加载（≤50 条）+ 分页加载（>50 条）**
   - 理由：子评论通常不多，全量加载用户体验更好；超过 50 条时分页，避免性能问题

3. **评论数量是否需要 Redis 缓存？**
   - ✅ 选择：**需要**
   - 理由：高并发场景下避免 COUNT 查询，提升性能；使用 `luhanxin:article:comment_count:{id}` 缓存
