## ADDED Requirements

### Requirement: 已登录用户可通过顶栏按钮快速创建文章

顶栏右侧 SHALL 显示「写文章」按钮。已登录用户点击后 SHALL 打开全屏 ArticleEditor。

#### Scenario: 已登录用户点击写文章
- **WHEN** 已登录用户点击顶栏「写文章」按钮
- **THEN** 全屏 ArticleEditor 打开，可编写标题/内容/标签，提交后创建文章

#### Scenario: 未登录用户点击写文章
- **WHEN** 未登录用户点击顶栏「写文章」按钮
- **THEN** 跳转到 `/auth` 登录页

#### Scenario: 创建文章成功后跳转
- **WHEN** 用户在顶栏编辑器中保存文章成功
- **THEN** 编辑器关闭，页面跳转到新文章详情页 `/post/:id`
