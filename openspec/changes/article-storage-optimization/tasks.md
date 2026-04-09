## 1. Proto 定义

- [ ] 1.1 在 `proto/luhanxin/community/v1/article.proto` 中新增 `TocItem` message — text/id/level/children 字段
- [ ] 1.2 在 `proto/luhanxin/community/v1/article.proto` 中新增 `ArticleAst` message — toc/plain_text/word_count/reading_time/headings/code_block_count/image_count/link_count/version 字段
- [ ] 1.3 修改 `GetArticleRequest` — 新增 `bool include_ast = 2` 字段
- [ ] 1.4 修改 `GetArticleResponse` — 新增 `ArticleAst ast = 2` 字段

> **依赖**：无前置依赖。Proto 定义优先。

## 2. 数据库迁移

- [ ] 2.1 创建 `services/migration/src/m20260406_000001_add_article_ast_and_compression.rs` — 新增 `article_ast` JSONB 列和 `compressed_content` BYTEA 列
- [ ] 2.2 在 `services/migration/src/lib.rs` 中注册新迁移模块
- [ ] 2.3 在 `services/shared/src/entity/articles.rs` 中新增 `article_ast: Option<serde_json::Value>` 和 `compressed_content: Option<Vec<u8>>` 字段
- [ ] 2.4 实现 down 方法 — 删除新增列

> **依赖**：依赖 Phase 1（Proto 定义确定字段结构）。

## 3. Rust Markdown 解析

- [ ] 3.1 在 `services/shared/Cargo.toml` 中添加 `pulldown-cmark` 依赖
- [ ] 3.2 创建 `services/shared/src/article/mod.rs` — 文章处理模块入口
- [ ] 3.3 创建 `services/shared/src/article/markdown.rs` — 实现 `parse_markdown_ast(content: &str) -> ArticleAstData`
- [ ] 3.4 实现 TOC 树构建 — 将平铺标题列表转换为嵌套 TocItem 树，生成 slug 化锚点 ID
- [ ] 3.5 实现字数统计和阅读时间估算 — 中文 400字/分钟，英文 200词/分钟
- [ ] 3.6 编写 ArticleAstData → Proto ArticleAst 转换函数
- [ ] 3.7 编写单元测试

> **依赖**：依赖 Phase 1（Proto 类型）。可与 Phase 2 并行。

## 4. 压缩/解压实现

- [ ] 4.1 在 `services/shared/Cargo.toml` 中添加 `zstd` 依赖
- [ ] 4.2 创建 `services/shared/src/article/compression.rs` — 实现 compress_content 和 decompress_content
- [ ] 4.3 封装透明读写 — `read_content()` 优先 compressed_content fallback content；`write_content()` 返回原始+压缩
- [ ] 4.4 定义 `CompressionError` 枚举
- [ ] 4.5 编写压缩性能基准测试和单元测试

> **依赖**：依赖 Phase 2（数据库列就绪）。可与 Phase 3 并行。

## 5. svc-content handler 集成

- [ ] 5.1 修改 `CreateArticle` handler — 创建时调用 parse_markdown_ast + compress_content，写入三个列
- [ ] 5.2 修改 `UpdateArticle` handler — content 变更时重新解析 AST + 压缩
- [ ] 5.3 修改 `GetArticle` handler — 根据 include_ast 填充 ArticleAst；使用透明解压读取 content
- [ ] 5.4 修改 `ListArticles` handler — 列表不返回 AST
- [ ] 5.5 集成测试

> **依赖**：依赖 Phase 3 + Phase 4。

## 6. Proto 代码生成

- [ ] 6.1 执行 `make proto`
- [ ] 6.2 验证生成的 Rust 结构体
- [ ] 6.3 修复编译错误

> **依赖**：依赖 Phase 1 + Phase 3。

## 7. 迁移脚本

- [ ] 7.1 创建批量迁移工具 — 分批查询 compressed_content IS NULL 的文章（每批 100 篇）
- [ ] 7.2 实现单篇迁移 — 压缩 + 解析 AST + UPDATE
- [ ] 7.3 添加进度日志和速率限制
- [ ] 7.4 实现断点续传
- [ ] 7.5 验证迁移正确性

> **依赖**：依赖 Phase 4 + Phase 5。

## 8. 验证

- [ ] 8.1 端到端 gRPC 测试 — Create/Get/Update 全流程
- [ ] 8.2 include_ast=true/false 验证
- [ ] 8.3 大文章性能测试（100KB+）
- [ ] 8.4 回退测试（compressed_content 为 NULL）
- [ ] 8.5 更新设计文档
