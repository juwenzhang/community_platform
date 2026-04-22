# editor-standalone-app

> 把 `@luhanxin/doc-editor` 包升级为独立的文档编辑站点 `apps/doc-editor/`（Garfish 子应用 + 可独立域名部署）。

---

## Why

当前 `@luhanxin/doc-editor` 只在 `apps/main` 内以共享包形式被消费，承载的是「编辑社区文章」这一个场景。随着产品成熟，需要一个**独立的文档产品形态**：

- 类比：飞书主站 + `docs.feishu.cn`，语雀内容社区 + 语雀工作台
- 满足"个人知识库"「文档工作台」场景，不绑定社区文章发布
- 用户可以写各种非文章性质的文档（笔记、wiki、草稿、共享文档）
- 提供**细粒度可见性**（public / private / unlisted）
- 提供**发布到平台**能力（一键把文档内容转为 platform article）

本 change 不改动已有的 `/post/:id/edit`（那个继续服务"发文章"场景）。

---

## What

### 交付物

1. **新增 `apps/doc-editor/` 独立 Garfish 子应用**
   - 独立端口（dev 5176）+ 独立构建
   - 路由：`/editor/:docId`、`/editor/new`、`/editor/list`（我的文档）
   - 复用 `@luhanxin/doc-editor` 包的全部能力
   - 可独立域名部署（如 `editor.luhanxin-community.com`）

2. **新增 `documents` 后端领域**
   - 新 proto：`DocumentService`（CreateDocument / GetDocument / UpdateDocument / DeleteDocument / ListDocuments / PublishToArticle）
   - 新 SeaORM entity：`documents { id, owner_id, title, content, visibility, published_article_id?, created_at, updated_at }`
   - `visibility` 枚举：`public / private / unlisted`

3. **「发布到平台」功能**
   - 文档工具栏新增「发布为文章」按钮
   - 调用 `PublishToArticle` RPC：内部创建 article + 在 document.published_article_id 关联
   - 后续文档修改可选择「同步到已发布文章」（单向同步）

4. **可见性与权限**
   - `public`：任何人可访问 URL（有意义的 slug）
   - `unlisted`：知道 URL 的人可访问（不索引到搜索）
   - `private`：仅作者可访问

---

## Non-goals

- **不做协同编辑**（由 `editor-collab` change）
- **不做服务端版本快照**（由 `editor-versioning` change）
- **不做文档分享链接密码**（未来可做）
- **不做文档目录树 / 层级**（首版只做扁平列表）
- **不改 article 的 schema**（同步是单向复制 content）

---

## Capabilities

### 新增 Capabilities

1. `doc-editor-standalone-app` — 独立子应用壳（路由、布局、鉴权）
2. `document-service` — 后端 documents CRUD + 权限 + 可见性
3. `document-to-article-publish` — 文档 → 文章的同步流程
4. `document-visibility` — 公开/私密/不列出 访问控制

---

## Impact

### Affected

- 新增 `apps/doc-editor/`（独立包）
- `proto/luhanxin/community/v1/` 新增 `document.proto`
- `services/svc-content/` 新增 document handler
- `services/migration/` 新增 documents 表迁移
- `apps/main/src/components/Layout`：在用户菜单里加「我的文档」入口（外链到 editor 子应用）

### Not Affected

- 已有 `articles` schema / 路由 / 编辑器（`/post/:id/edit` 保持现状）
- `@luhanxin/doc-editor` 包的 API（纯消费）

---

## 依赖

- 必须先完成 `next-gen-document-editor` change（即本 change 依赖 doc-editor 包的稳定交付）
- 可选：先完成 `frontend-app-split`（理解 Garfish 子应用接入模式）

---

## 预估工作量

**~60h**（约 8 个工作日），大致分配：
- 独立 app 壳（路由/鉴权/Layout/Garfish 接入）: 12h
- 后端 documents schema + RPC + handler: 14h
- 「发布到平台」同步流程: 8h
- 可见性与权限控制（前端 UI + 后端校验）: 8h
- 文档列表 UI + 我的文档页: 6h
- E2E + 联调 + 文档: 8h
- 预留: 4h

启动时机：等 `next-gen-document-editor` 归档 + 有明确产品需求（用户数达到一定规模 / 评论富文本/wiki 等场景需要）再启动。
