## 1. 顶栏 UI（已完成）

- [x] 1.1 在 `components/Layout/index.tsx` 顶栏右侧添加「写文章」按钮：已登录跳转 `/profile/manage`，未登录跳转 `/auth`
- [x] 1.2 在 `components/Layout/index.tsx` 顶栏右侧添加搜索输入框 + 联想搜索下拉（Popover），300ms debounce，展示前 5 条匹配文章
- [x] 1.3 更新 `components/Layout/layout.module.less`：搜索框 + 写文章按钮 + UserArea 水平布局 + 联想下拉样式

## 2. 后端搜索增强

- [x] 2.1 新增 migration `m20260402_000001_enable_pg_trgm.rs`：启用 `pg_trgm` 扩展 + 创建 `idx_articles_title_trgm` 和 `idx_articles_content_trgm` GIN trigram 索引
- [x] 2.2 修改 `svc-content/handlers/article/mod.rs` 的 `list_articles` 函数：搜索条件从 `Title LIKE` 改为 `(title ILIKE OR content ILIKE) OR similarity(title, query) > 0.1`，有 query 时按 `similarity(title, query) DESC` 排序

## 3. 验证

- [x] 3.1 运行 migration 确保 pg_trgm 扩展启用成功，编译后端确认无错误
