# Tasks: Article CRUD

## Phase 0: Proto 扩展 + 代码生成

> 依赖: 无

- [ ] 0.1 扩展 `article.proto`：新增 CreateArticle、UpdateArticle、DeleteArticle RPC + Request/Response
- [ ] 0.2 运行 `make proto` 生成 Rust + TypeScript 代码
- [ ] 0.3 验证生成代码编译通过

## Phase 1: svc-content 微服务骨架

> 依赖: 0.3

- [ ] 1.1 创建 `services/svc-content/Cargo.toml`（workspace member，引用 shared）
- [ ] 1.2 创建 `svc-content/src/main.rs`：gRPC server + Consul 注册 + DB 初始化（参照 svc-user）
- [ ] 1.3 创建 `svc-content/src/config.rs`：配置加载
- [ ] 1.4 注册到 workspace `services/Cargo.toml` members
- [ ] 1.5 验证 `cargo check -p svc-content`

## Phase 2: svc-content handler 实现

> 依赖: 1.5

- [ ] 2.1 创建 `handlers/article/mod.rs`：get_article、list_articles（复用 Entity + 游标分页 + total_count）
- [ ] 2.2 在 handlers/article/mod.rs 中实现 create_article（UUID 生成、slug 生成、author_id 从 metadata）
- [ ] 2.3 在 handlers/article/mod.rs 中实现 update_article（author_id 权限校验）
- [ ] 2.4 在 handlers/article/mod.rs 中实现 delete_article（author_id 权限校验）
- [ ] 2.5 创建 `services/article/mod.rs`：ArticleService trait 5 个方法实现
- [ ] 2.6 验证 `cargo check -p svc-content`

## Phase 3: Gateway 转发

> 依赖: 2.6

- [ ] 3.1 创建 `gateway/src/services/article/mod.rs`：GatewayArticleService 5 个方法转发
- [ ] 3.2 更新 `gateway/src/main.rs`：注册 ArticleServiceServer + gRPC-Web
- [ ] 3.3 更新 AuthInterceptor 白名单：GetArticle + ListArticles 为公开方法
- [ ] 3.4 创建 `gateway/src/routes/article/mod.rs`：Swagger REST proxy 5 个端点
- [ ] 3.5 更新 `main.rs` OpenAPI paths + schemas
- [ ] 3.6 验证 `cargo check -p gateway`

## Phase 4: 前端 — 文章列表 + 详情

> 依赖: 3.6

- [ ] 4.1 创建 `pages/article/components/ArticleCard/`：文章卡片（标题+摘要+作者+标签+时间）
- [ ] 4.2 创建 `pages/article/components/ArticleList/`：调 ListArticles + 分页
- [ ] 4.3 重写 `pages/article/index.tsx`：文章列表页（子路由入口）
- [ ] 4.4 创建 `pages/article/pages/detail/index.tsx`：文章详情页（Markdown 渲染）
- [ ] 4.5 安装 react-markdown + rehype-highlight 依赖
- [ ] 4.6 更新 `routes/routes.tsx`：article 子路由配置

## Phase 5: 前端 — 创建/编辑

> 依赖: 4.6

- [ ] 5.1 创建 `pages/article/components/ArticleEditor/`：编辑器组件（标题+内容+标签+状态）
- [ ] 5.2 创建 `pages/article/pages/create/index.tsx`：创建文章页（需认证）
- [ ] 5.3 创建 `pages/article/pages/edit/index.tsx`：编辑文章页（需认证+作者校验）
- [ ] 5.4 更新子路由配置

## Phase 6: 首页改造

> 依赖: 4.2

- [ ] 6.1 首页主内容区改为 ArticleList（替代当前 UserList）
- [ ] 6.2 UserList 移到右侧栏"活跃用户"位置
- [ ] 6.3 Tab 栏："推荐" / "最新" 切换排序

## Phase 7: 基础设施

> 依赖: 1.2

- [ ] 7.1 Makefile 更新：dev-backend 启动 svc-content
- [ ] 7.2 docker/.env 新增 SVC_CONTENT_PORT=50052
- [ ] 7.3 apiTester.http 新增文章 API 测试用例

## Phase 8: 端到端验证

> 依赖: 全部

- [ ] 8.1 启动后端，grpcurl 测试 CreateArticle / GetArticle / ListArticles
- [ ] 8.2 启动前端，创建文章 → 首页展示 → 点击查看详情
- [ ] 8.3 编辑文章 → 内容更新
- [ ] 8.4 非作者尝试编辑 → PERMISSION_DENIED
- [ ] 8.5 未登录查看文章列表 → 正常展示
- [ ] 8.6 未登录尝试创建 → UNAUTHENTICATED
