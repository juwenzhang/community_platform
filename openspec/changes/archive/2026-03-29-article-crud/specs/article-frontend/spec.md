## ADDED Capability: article-frontend

前端文章列表、详情、创建、编辑页面。

### Requirement: 文章列表页

首页主内容区 SHALL 展示已发布文章列表（替代当前用户列表）。

- 每条文章卡片：标题 + 摘要 + 作者名 + 标签 + 发布时间
- 点击跳转 `/article/:id`
- 游标分页（滚动加载或分页按钮）

#### Scenario: 首页展示文章

- **WHEN** 访问首页
- **THEN** 主内容区展示 ListArticles（status=PUBLISHED）的结果

### Requirement: 文章详情页

`/article/:id` SHALL 展示文章完整内容。

- Markdown 渲染（react-markdown + 代码高亮）
- 顶部：标题 + 作者信息 + 发布时间 + 标签
- 底部：返回列表按钮
- 如果是作者本人：显示"编辑"按钮

### Requirement: 文章创建/编辑页

`/article/create` 和 `/article/:id/edit` SHALL 提供文章编辑表单。

- 标题输入
- 内容 textarea（Markdown）
- 标签选择（Input.Tag 或手动输入）
- 状态选择：草稿 / 发布
- 保存按钮

#### Scenario: 创建文章

- **WHEN** 认证用户在 `/article/create` 填写表单并点击发布
- **THEN** 调用 CreateArticle RPC，成功后跳转到文章详情页

#### Scenario: 编辑文章

- **WHEN** 作者在 `/article/:id/edit` 修改内容并保存
- **THEN** 调用 UpdateArticle RPC，成功后跳转到文章详情页
