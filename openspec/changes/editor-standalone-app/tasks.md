# editor-standalone-app — Tasks

> 占位 change，暂不实施。待 `next-gen-document-editor` 归档后再细化。

## Phase 0: 设计与澄清

- [ ] T0.1 与产品确认 documents 字段清单（title/tags/visibility/cover_image/...）
- [ ] T0.2 与产品确认"发布到平台"同步规则（单向同步 / 双向同步 / 一次性复制）
- [ ] T0.3 与运维确认独立域名部署方式（子域名 vs 路径前缀 vs 独立站点）
- [ ] T0.4 补充 design.md

## Phase 1: 后端 documents 领域

- [ ] T1.1 proto：`document.proto` 定义 `DocumentService` + `Document / Visibility / ListOptions`
- [ ] T1.2 SeaORM entity + migration：documents 表
- [ ] T1.3 handler：CRUD + 可见性校验 + 权限校验
- [ ] T1.4 `PublishToArticle` RPC 实现（创建 article + 建立关联）
- [ ] T1.5 svc-content service 层接入
- [ ] T1.6 gateway REST 透传
- [ ] T1.7 gRPC E2E 测试

## Phase 2: apps/doc-editor 子应用

- [ ] T2.1 新建 `apps/doc-editor/` + package.json + vite.config.ts（Garfish 子应用模式，端口 5176）
- [ ] T2.2 注册到 `.dev-registry.json` + app-registry
- [ ] T2.3 路由：`/`（我的文档列表）/ `/:docId` / `/new`
- [ ] T2.4 Layout：侧栏（文档列表）+ 顶栏（编辑器工具 + 可见性切换 + 发布按钮）
- [ ] T2.5 鉴权：复用主站 token（Garfish props 注入）
- [ ] T2.6 i18n 独立

## Phase 3: 编辑器集成

- [ ] T3.1 复用 `@luhanxin/doc-editor` 的 `<DocEditor>` 组件
- [ ] T3.2 onSave 接入 `UpdateDocument` RPC
- [ ] T3.3 文档列表页（列出用户所有文档，按 updated_at）
- [ ] T3.4 新建文档流程（/new → 填标题 → 创建 → 跳转 /:id）

## Phase 4: 可见性与分享

- [ ] T4.1 可见性切换 UI（public / private / unlisted 三选一）
- [ ] T4.2 访问权限校验（后端 handler + 前端路由守卫）
- [ ] T4.3 分享链接生成（含 slug）
- [ ] T4.4 公开文档的 SEO meta

## Phase 5: 发布到平台

- [ ] T5.1 "发布为文章" 按钮（文档工具栏）
- [ ] T5.2 发布对话框：选分类 / 标签 / 状态 → 调 PublishToArticle
- [ ] T5.3 已发布文档标记"已发布"徽章
- [ ] T5.4 "同步到已发布文章" 按钮（文档更新后可选择同步）
- [ ] T5.5 取消发布 / 删除关联的 article

## Phase 6: 文档与归档

- [ ] T6.1 README
- [ ] T6.2 openspec archive

---

**总预估**: ~60h（8 个工作日）

**启动前提**:
- `next-gen-document-editor` 已归档
- 产品明确 documents 领域的需求范围
- 独立域名方案确定
