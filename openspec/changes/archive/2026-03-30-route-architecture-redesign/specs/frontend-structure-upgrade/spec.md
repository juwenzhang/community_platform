# frontend-structure-upgrade — Delta Spec

## 变更说明
共享组件从 `pages/article/components/` 提升到 `src/components/`，消除跨模块引用。

## 变更内容

**组件提升：**
- `pages/article/components/ArticleCard/` → `components/ArticleCard/`
- `pages/article/components/ArticleList/` → `components/ArticleList/`
- `pages/article/components/ArticleEditor/` → `components/ArticleEditor/`
- `pages/article/components/ArticleToc/` → `components/ArticleToc/`

**旧文件删除：**
- `pages/article/index.tsx` + `pages/article/article.module.less`
- `pages/article/components/ArticleSidebar/` (整个目录)
- 最终删除空的 `pages/article/` 目录

**Import 路径更新：**
所有引用 `pages/article/components/*` 的文件改为 `@/components/*`。
