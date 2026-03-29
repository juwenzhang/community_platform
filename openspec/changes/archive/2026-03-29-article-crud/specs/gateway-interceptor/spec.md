## MODIFIED Requirements

### Requirement: AuthInterceptor 公开方法扩展

AuthInterceptor 的公开方法白名单 SHALL 新增：

- `luhanxin.community.v1.ArticleService/GetArticle`
- `luhanxin.community.v1.ArticleService/ListArticles`

CreateArticle / UpdateArticle / DeleteArticle 不在白名单中，需要认证。

#### Scenario: 公开访问文章列表

- **WHEN** 未携带 token 调用 ListArticles
- **THEN** AuthInterceptor 跳过认证，正常返回文章列表
