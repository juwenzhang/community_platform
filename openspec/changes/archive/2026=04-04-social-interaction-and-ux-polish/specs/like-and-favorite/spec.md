## ADDED Requirements

### Requirement: Social Proto Definition
定义 `social.proto`，包含 SocialService 和相关消息类型。

#### Scenario: Proto 定义完整性
- **WHEN** 运行 `buf lint`
- **THEN** social.proto 通过所有 lint 规则

### Requirement: Likes Database Table
创建 likes 表，支持用户对文章点赞。

#### Scenario: 创建 likes 表
- **WHEN** 运行数据库迁移
- **THEN** likes 表被创建，包含 user_id(FK) + article_id(FK) 复合主键 + created_at

### Requirement: Favorites Database Table
创建 favorites 表，支持用户收藏文章。

#### Scenario: 创建 favorites 表
- **WHEN** 运行数据库迁移
- **THEN** favorites 表被创建，包含 user_id(FK) + article_id(FK) 复合主键 + created_at

### Requirement: Like Article
已认证用户可以点赞文章。

#### Scenario: 点赞
- **WHEN** 用户已认证且调用 LikeArticle
- **THEN** likes 表插入记录（幂等，重复点赞不报错）
- **THEN** articles.like_count 更新为精确计数

#### Scenario: 取消点赞
- **WHEN** 用户已认证且调用 UnlikeArticle
- **THEN** likes 表删除记录（幂等，未点赞也不报错）
- **THEN** articles.like_count 更新为精确计数

### Requirement: Favorite Article
已认证用户可以收藏文章。

#### Scenario: 收藏
- **WHEN** 用户已认证且调用 FavoriteArticle
- **THEN** favorites 表插入记录（幂等）

#### Scenario: 取消收藏
- **WHEN** 用户已认证且调用 UnfavoriteArticle
- **THEN** favorites 表删除记录（幂等）

### Requirement: Get Article Interaction
查询当前用户对某篇文章的互动状态。

#### Scenario: 已认证用户查询
- **WHEN** 已认证用户调用 GetArticleInteraction(article_id)
- **THEN** 返回 liked(bool), favorited(bool), like_count(int32), favorite_count(int32)

#### Scenario: 未认证用户查询
- **WHEN** 未认证用户调用 GetArticleInteraction
- **THEN** liked=false, favorited=false，仍返回 like_count 和 favorite_count

### Requirement: List Favorites
用户可以查看自己的收藏列表。

#### Scenario: 获取收藏列表
- **WHEN** 已认证用户调用 ListFavorites
- **THEN** 返回用户收藏的文章列表，按收藏时间倒序

### Requirement: Social Gateway REST Routes
Gateway 暴露社交互动 REST 端点。

#### Scenario: REST 端点映射
- **WHEN** Gateway 启动
- **THEN** 以下端点可用：
  - `POST /api/v1/articles/{id}/like` — 点赞
  - `DELETE /api/v1/articles/{id}/like` — 取消点赞
  - `POST /api/v1/articles/{id}/favorite` — 收藏
  - `DELETE /api/v1/articles/{id}/favorite` — 取消收藏
  - `GET /api/v1/articles/{id}/interaction` — 获取互动状态
  - `GET /api/v1/user/favorites` — 获取收藏列表

### Requirement: ArticleActions Frontend Integration
前端 ArticleActions 组件接入真实 API。

#### Scenario: 点赞按钮
- **WHEN** 用户点击点赞按钮
- **THEN** 调用 LikeArticle/UnlikeArticle，按钮切换已点赞/未点赞样式
- **THEN** like_count 实时更新

#### Scenario: 收藏按钮
- **WHEN** 用户点击收藏按钮
- **THEN** 调用 FavoriteArticle/UnfavoriteArticle，按钮切换已收藏/未收藏样式

#### Scenario: 初始状态
- **WHEN** 用户打开文章详情页
- **THEN** 调用 GetArticleInteraction 获取当前互动状态
- **THEN** 按钮正确显示已点赞/已收藏状态
