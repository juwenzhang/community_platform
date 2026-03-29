## ADDED Capability: article-gateway

Gateway 层文章路由转发 + Swagger REST proxy。

### Requirement: GatewayArticleService 转发

Gateway SHALL 实现 `ArticleService` 的 5 个 gRPC 方法转发：

- GetArticle / ListArticles：公开方法，直接转发
- CreateArticle / UpdateArticle / DeleteArticle：需认证，从 ctx.attrs 取出 user_id 设置到下游 x-user-id metadata

#### Scenario: 创建文章需认证

- **WHEN** 未携带 token 调用 CreateArticle
- **THEN** AuthInterceptor 拦截，返回 UNAUTHENTICATED

### Requirement: Swagger REST proxy

Gateway SHALL 提供以下 REST 端点（Swagger 文档化）：

| 方法 | 路径 | 认证 |
|------|------|------|
| GET | `/api/v1/articles` | 否 |
| GET | `/api/v1/articles/{id}` | 否 |
| POST | `/api/v1/articles` | Bearer |
| PUT | `/api/v1/articles/{id}` | Bearer |
| DELETE | `/api/v1/articles/{id}` | Bearer |
