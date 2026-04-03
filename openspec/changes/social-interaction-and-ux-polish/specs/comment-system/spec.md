## ADDED Requirements

### Requirement: Comment Proto Definition
定义 `comment.proto`，包含 CommentService 和相关消息类型。

#### Scenario: Proto 定义完整性
- **WHEN** 运行 `buf lint`
- **THEN** comment.proto 通过所有 lint 规则

### Requirement: Comments Database Table
创建 comments 表，支持文章评论和二级回复。

#### Scenario: 创建 comments 表
- **WHEN** 运行数据库迁移
- **THEN** comments 表被创建，包含 id(UUID PK), article_id(FK), author_id(FK), content(TEXT), parent_id(FK nullable, 顶级评论ID), reply_to_id(FK nullable, 被回复评论ID), mentions(TEXT[] 被@的用户名列表), created_at, updated_at
- **THEN** article_id + created_at 上有索引
- **THEN** parent_id 上有索引（查子回复用）

### Requirement: Create Comment
已认证用户可以对文章发表评论或回复某条评论。

#### Scenario: 发表顶级评论
- **WHEN** 用户已认证且提交 article_id + content（parent_id 和 reply_to_id 为空）
- **THEN** 创建评论成功，返回评论详情（含 author 信息）

#### Scenario: 二级回复评论
- **WHEN** 用户已认证且提交 article_id + content + parent_id（顶级评论 ID）+ reply_to_id（被回复的评论 ID）
- **THEN** 创建回复成功
- **THEN** parent_id 始终指向顶级评论（不允许三级及以上嵌套）
- **THEN** reply_to_id 指向被回复的具体评论（可以是顶级评论或其他二级回复）

#### Scenario: @提及用户
- **WHEN** 评论内容包含 `@username` 格式的文本
- **THEN** 后端从 content 中解析出 mentions 列表存入 mentions 字段
- **THEN** 前端渲染时将 `@username` 高亮为可点击链接，跳转到 `/user/:username`
- **THEN** 当 mentions 非空时，通过 NATS 发布 `luhanxin.events.comment.mentioned` 事件（为下一期通知服务预留）

#### Scenario: 未认证用户评论
- **WHEN** 用户未认证
- **THEN** 返回 401 Unauthorized

### Requirement: List Comments
任何人可以查看文章的评论列表（二级嵌套结构）。

#### Scenario: 获取文章评论
- **WHEN** 提供 article_id
- **THEN** 返回该文章的评论列表，顶级评论按 created_at 升序排列
- **THEN** 每条顶级评论包含其 replies（二级回复列表，按 created_at 升序）
- **THEN** 每条评论包含 author 信息（id, username, display_name, avatar_url）
- **THEN** 二级回复包含 reply_to_id 和 reply_to_author 信息（被回复者的用户名，方便显示「回复 @xxx」）

### Requirement: Delete Comment
评论作者可以删除自己的评论。

#### Scenario: 作者删除顶级评论
- **WHEN** 已认证用户删除自己的顶级评论
- **THEN** 该评论及其所有子回复被物理删除

#### Scenario: 作者删除二级回复
- **WHEN** 已认证用户删除自己的二级回复
- **THEN** 仅该回复被物理删除

#### Scenario: 非作者删除
- **WHEN** 已认证用户尝试删除他人评论
- **THEN** 返回 403 Forbidden

### Requirement: Comment Gateway REST Routes
Gateway 暴露评论 REST 端点。

#### Scenario: REST 端点映射
- **WHEN** Gateway 启动
- **THEN** 以下端点可用：
  - `POST /api/v1/articles/{id}/comments` — 创建评论（body 含 parent_id/reply_to_id/content）
  - `GET /api/v1/articles/{id}/comments` — 获取评论列表（返回二级嵌套结构）
  - `DELETE /api/v1/comments/{id}` — 删除评论

### Requirement: Comment Frontend Component
文章详情页展示评论区，支持二级嵌套、表情、@提及。

#### Scenario: 评论区渲染
- **WHEN** 用户访问文章详情页
- **THEN** 文章正文下方显示 CommentSection 组件
- **THEN** 显示评论总数和评论列表
- **THEN** 顶级评论下方缩进展示子回复
- **THEN** 每条子回复显示「回复 @username」前缀
- **THEN** 已认证用户可看到评论输入框
- **THEN** 未认证用户看到「登录后评论」提示

#### Scenario: 回复交互
- **WHEN** 用户点击某条评论的「回复」按钮
- **THEN** 评论输入框聚焦，自动填入 `@被回复者用户名 `
- **THEN** 提交时自动携带 parent_id 和 reply_to_id

#### Scenario: 表情输入
- **WHEN** 用户点击评论输入框旁的表情按钮
- **THEN** 弹出 Emoji Picker 面板
- **THEN** 选择表情后插入到输入框光标位置（unicode emoji，不需后端处理）

#### Scenario: @提及输入
- **WHEN** 用户在评论框中输入 `@` 字符
- **THEN** 弹出用户名联想下拉（调用 UserService.ListUsers 搜索）
- **THEN** 选择用户后插入 `@username ` 到输入框
- **THEN** 渲染评论时 `@username` 显示为蓝色可点击链接，跳转 `/user/:username`
