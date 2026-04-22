## 任务拆分

> 总计 47 任务 / 6 个 Phase / 预估 ~78h（约 10 个工作日）
> 任务粒度：每项 1-3h，可独立验收
> 依赖标注：`(deps: T1.1, T1.2)` 表示该任务依赖之前的任务

---

### Phase 1: 包基础设施（~10h）

#### T1.1 创建包目录与 package.json

- [x] `packages/doc-editor/package.json`：name `@luhanxin/doc-editor`、version `0.1.0`、type module
- [x] peerDependencies：`react ^18` `react-dom ^18`
- [x] dependencies：`@tiptap/core` `@tiptap/pm` `@tiptap/react` `@tiptap/starter-kit` `@tiptap/suggestion` `tippy.js` `idb` `lowlight` `@luhanxin/md-parser-core: workspace:*`
- [x] devDependencies：`tsup` `typescript` `vitest` `@types/react` 等

预估：1h

#### T1.2 配置 tsconfig + tsup

- [x] `tsconfig.json` extends 项目根 base
- [x] `tsup.config.ts`：esm 输出、external `react/react-dom/@tiptap/*/@luhanxin/md-parser-core`、生成 .d.ts、source map
- [x] `pnpm build` 通过

预估：1h

#### T1.3 创建包入口与目录骨架

- [x] `src/index.ts` 占位
- [x] 创建 `src/{core,blocks,slash,menu,convert,autosave,react,types}/` 全部目录
- [x] 各目录 `index.ts` 占位

预估：1h

#### T1.4 实现 Editor 工厂 createEditor

- [x] `src/core/createEditor.ts`：接收配置（content、placeholder、editable、onUpdate），返回 TipTap `Editor` 实例
- [x] `src/core/extensions.ts`：导出默认扩展数组（暂时只有 starter-kit）
- [x] 单测：能创建实例、能 destroy

预估：2h

#### T1.5 实现 Markdown → PM JSON 转换器

- [x] `src/convert/markdownToJson.ts`：用 md-parser-core 的 `parseMarkdownToAst` 拿 mdast
- [x] `src/convert/mdast-bridge.ts`：mdast 节点 → PM JSON 节点的映射表（先支持基础节点：paragraph/heading/list/blockquote/code/inlineCode/link/image/strong/em/text）
- [x] 单测：基础 Markdown 转换正确

预估：2h

#### T1.6 实现 PM JSON → Markdown 转换器

- [x] `src/convert/jsonToMarkdown.ts`：递归遍历 PM JSON，调用各节点序列化方法
- [x] 处理基础节点（同 T1.5 范围）
- [x] 单测：基础节点序列化正确

预估：2h

#### T1.7 round-trip 等价性测试

- [x] `src/convert/__tests__/round-trip.test.ts`
- [x] 准备 5 个典型 Markdown 样本（含标题、列表、引用、代码块、链接）
- [x] 断言 `jsonToMarkdown(markdownToJson(md))` 与 `md` 在规范化后等价

预估：1h

---

### Phase 2: 块系统（~22h）

#### T2.1 代码块扩展（CodeBlockView）

- [x] `src/blocks/code-block/CodeBlock.ts`：基于 `@tiptap/extension-code-block-lowlight`
- [x] `src/blocks/code-block/CodeBlockView.tsx`：NodeView 含语言下拉、复制按钮
- [x] lowlight 注册 20 种常用语言
- [x] 转换器：mdast `code` ↔ PM `codeBlock`
- [x] 单测

预估：3h

#### T2.2 图片块扩展

- [x] `src/blocks/image/Image.ts`：扩展 `@tiptap/extension-image`，支持 alt 编辑、对齐、resize
- [x] `src/blocks/image/ImageView.tsx`：NodeView 含 caption 输入、resize handle
- [x] `src/blocks/image/upload.ts`：定义 `UploadHandler` 接口（与 `AvatarUpload` 现有模式对齐：`upload(file, folder?) → { url, alt? }`）
- [x] 转换器：mdast `image` ↔ PM `image`

预估：3h

#### T2.3 表格扩展集成与样式

- [x] 集成 `@tiptap/extension-table` + 相关扩展（row/cell/header）
- [x] 转换器：mdast `table` ↔ PM `table`
- [x] 单测

预估：2h

#### T2.4 任务列表扩展集成

- [x] 集成 `@tiptap/extension-task-list` + `@tiptap/extension-task-item`
- [x] 转换器：mdast `list` (with checkbox) ↔ PM `taskList`/`taskItem`
- [x] 单测

预估：2h

#### T2.5 容器块扩展（tip/warning/info/danger）

- [x] `src/blocks/container/Container.ts`：自定义 TipTap Node，attrs `{ type: 'tip'|'warning'|'info'|'danger', title?: string }`
- [x] `src/blocks/container/ContainerView.tsx`：NodeView 含图标 + 标题输入 + 嵌套内容
- [x] mdast 端用 `:::` 自定义语法（与 md-parser-core 的 remark-container 对齐）
- [x] 转换器：mdast `container` ↔ PM `container`
- [x] 单测

预估：4h

#### T2.6 Mermaid 块扩展

- [x] `src/blocks/mermaid/Mermaid.ts`：自定义 Node，attrs `{ code: string }`
- [x] `src/blocks/mermaid/MermaidView.tsx`：NodeView 含「编辑/预览」切换
- [x] 预览使用 dynamic import mermaid（避免主包体积）
- [x] 转换器：mdast 代码块（`lang === 'mermaid'`）↔ PM `mermaid`
- [x] 单测

预估：4h

#### T2.7 数学公式块扩展（KaTeX）

- [x] `src/blocks/math/InlineMath.ts` + `BlockMath.ts`：自定义 Node
- [x] `src/blocks/math/MathView.tsx`：KaTeX 渲染（dynamic import）
- [x] 转换器：mdast `math`/`inlineMath` ↔ PM
- [x] 单测

预估：3h

#### T2.8 注册自定义块到默认扩展集合

- [x] 更新 `src/core/extensions.ts`，导出含全部自定义块的默认扩展数组
- [x] 更新 `src/core/createEditor.ts`，使用新扩展集合
- [x] 集成测试：编辑器能挂载并切换全部块类型

预估：1h

---

### Phase 3: 交互层（~16h）

#### T3.1 Slash 命令架构

- [x] `src/slash/SlashCommand.ts`：基于 `@tiptap/suggestion` 的扩展
- [x] `src/slash/types.ts`：`SlashCommand` 接口
- [x] 触发字符 `/`，trigger 后弹 tippy 浮层
- [x] 单测：触发逻辑正确

预估：3h

#### T3.2 Slash 命令面板 UI

- [x] `src/slash/SlashPalette.tsx`：列表 UI、键盘上下选择、回车确认、Esc 关闭
- [x] 分组显示（基础 / 媒体 / 高级）
- [x] 搜索过滤（按 title + keywords）
- [x] 鼠标 hover 高亮

预估：3h

#### T3.3 默认命令注册

- [x] `src/slash/commands.ts`：定义 15 个默认命令（H1/H2/H3/quote/divider/ul/ol/task/image/code/table/math/mermaid/container-tip/container-warning）
- [x] 每个命令包含 icon、title、description、keywords、command 函数

预估：3h

#### T3.4 Bubble Menu（选区浮层）

- [x] `src/menu/BubbleMenu.tsx`：基于 `@tiptap/extension-bubble-menu`
- [x] 按钮：粗体、斜体、删除线、行内代码、链接、清除格式
- [x] 链接编辑弹层

预估：3h

#### T3.5 Floating Menu（空行行首浮层）

- [x] `src/menu/FloatingMenu.tsx`：基于 `@tiptap/extension-floating-menu`
- [x] 空行时显示「+」按钮，点击打开 SlashPalette

预估：2h

#### T3.6 块拖拽手柄 + 块级操作

- [x] `src/menu/BlockHandle.tsx`：行首悬停显示拖拽手柄 + 「⋯」菜单
- [x] 菜单项：删除块、复制块、上移、下移
- [x] 拖拽实现块级排序（基于 PM 的 NodeView drag handler）

预估：2h

---

### Phase 4: 持久化层（~12h）

#### T4.1 IndexedDB 草稿存储

- [x] `src/autosave/DraftStore.ts`：基于 `idb` 封装
- [x] schema：`{ id, articleId|null, contentJson, contentMarkdown, updatedAt, version }`
- [x] 方法：`saveDraft / loadDraft / loadByArticleId / listDrafts / deleteDraft / cleanupOld`
- [x] 30 天自动清理 + 数量超 50 时清理最老的
- [x] 单测

预估：3h

#### T4.2 useAutosave Hook

- [x] `src/autosave/useAutosave.ts`：参数 `{ editor, articleId, onRemoteSave, debounceMs?, intervalMs? }`
- [x] 防抖 800ms 写 IndexedDB（PM JSON）
- [x] 定时 30s 调用 `onRemoteSave(markdown)`（由消费方注入实际保存函数）
- [x] 暴露 `saveStatus: 'idle'|'saving-local'|'saved-local'|'saving-remote'|'saved-remote'|'error'`
- [x] 暴露 `forceSave()` 立即同步
- [x] 单测

预估：3h

#### T4.3 草稿恢复逻辑

- [x] 编辑器挂载时检查 IndexedDB
- [x] 若 `draft.updatedAt > article.updatedAt` 弹窗：「检测到本地未保存草稿，是否恢复？[恢复] [放弃]」
- [x] UI 组件 `<DraftRestorePrompt>`

预估：2h

#### T4.4 SaveStatusIndicator UI

- [x] `src/autosave/SaveStatusIndicator.tsx`：显示当前保存状态
- [x] 文案：「正在保存...」「已保存到本地」「已同步 · HH:MM」「保存失败 · 重试」
- [x] 错误时可点击重试

预估：2h

#### T4.5 离线检测与提示

- [x] 监听 `online`/`offline` 事件
- [x] 离线时跳过 remote save，仅本地
- [x] 网络恢复后立即触发一次 remote save
- [x] 顶部条提示「当前离线，内容仅保存到本地」

预估：2h

---

### Phase 5: 主站接入（~14h）

#### T5.1 在 apps/main 添加 doc-editor 依赖

- [x] `apps/main/package.json` 新增 `@luhanxin/doc-editor: workspace:*`
- [x] `pnpm install` 验证

预估：0.5h

#### T5.2 实现 React 集成层

- [x] `src/react/DocEditor.tsx`：主组件，props `{ initialContent, onChange, onSave, uploadHandler?, slashCommandsExtra?, readOnly? }`
- [x] `src/react/useDocEditor.ts`：暴露 editor 实例
- [x] `src/react/DocEditorProvider.tsx`：Context 注入上传 handler

预估：3h

#### T5.3 重写 ArticleEditor

- [x] 备份 `apps/main/src/components/ArticleEditor/index.tsx` → `index.legacy.tsx`
- [x] 重写 `index.tsx`：保留 props 签名（向上回调不变），内部从 textarea 改为 `<DocEditor>`
- [x] 集成 `useAutosave`，`onRemoteSave` 内部调用 `onSave({ content: markdown, ... })`
- [x] 移除「左右分栏预览」UI（块编辑器是 WYSIWYG）

预估：3h

#### T5.4 重写 ArticleEditor 样式

- [x] `articleEditor.module.less` 重写：移除 splitPane / editPane / previewPane
- [x] 顶部栏样式微调（编辑器需要更多垂直空间）
- [x] 字数 / 保存状态指示放在顶部右侧

预估：1.5h

#### T5.5 Cloudinary 上传 handler 接入

- [x] `packages/doc-editor/src/adapters/cloudinary-upload.ts`：默认实现 `createCloudinaryUploadHandler({ getSignatureUrl, getAuthToken, defaultFolder })`
- [x] 流程与 `apps/main/src/components/AvatarUpload/index.tsx` 对齐：`POST /api/v1/upload/sign` → 直传 `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload`
- [x] 文件夹命名：`article-images/{articleId 或 draft-uuid}/`
- [x] 错误处理：网络失败、签名失败、Cloudinary 错误都转为友好提示
- [x] 文件类型白名单：`image/jpeg`, `image/png`, `image/gif`, `image/webp`；大小上限 10MB（大于头像的 2MB）
- [x] 在 ArticleEditor 中用当前用户 token 注入 handler
- [x] 单测（mock fetch）

预估：2.5h

#### T5.5b 文章编辑路由升级 — **已取消**

> ❌ **取消原因**：经产品讨论，`/post/:id/edit` 和 `/editor/:docId` 是**两种独立的产品形态**，不应做路由重定向。
>
> - 站内文章编辑（`/post/:id/edit`）：保留，仍使用 `@luhanxin/doc-editor` 包，发布到 platform articles
> - 独立文档站（`/editor/:docId`）：由未来的 `editor-standalone-app` change 承接，会是独立 Garfish 子应用（`apps/doc-editor/`），独立 documents schema，支持 public/private/unlisted 可见性
> - 类比：飞书主站 + docs.feishu.cn；语雀内容社区 + 语雀工作台
>
> 详见 `design.md` Decision 14。

- [x] ~~在 `apps/main/src/routes/routes.tsx` 新增 `/editor/:docId` 路由，指向现有 edit 页面组件~~（取消）
- [x] ~~保留 `/post/:id/edit` 作为 301 重定向到 `/editor/:id`~~（取消）
- [x] ~~新建文章入口改为 `/editor/new`~~（取消）
- [x] ~~更新"写文章"按钮跳转目标~~（取消，`handleWrite` 保持跳 `/profile/manage`）
- [x] ~~验证外部书签（`/post/:id/edit` 形式）仍能访问~~（无需，路径未变）

预估：~~1h~~（取消）

#### T5.6 Feature flag 灰度

- [x] 添加 env 变量 `VITE_USE_DOC_EDITOR`
- [x] ArticleEditor 入口判断：开关开则用新编辑器，关则保留旧 textarea（legacy）
- [x] 文档说明灰度方法

预估：1h

#### T5.7 现有文章兼容性测试

- [ ] 用 5-10 篇平台已有的 Markdown 文章在新编辑器打开
- [ ] 验证：内容完整、格式正确、保存后再次打开等价
- [ ] 不能转换的节点要有降级提示

预估：1.5h

#### T5.8 E2E 测试

- [ ] `e2e/article-editor.spec.ts`：创建文章 → 输入内容 → Slash 插入块 → 自动保存 → 关闭重开（草稿恢复）→ 手动保存 → 详情页验证
- [ ] 断言保存后 `article.content` 是预期 Markdown

预估：1.5h

---

### Phase 6: 文档与归档（~4h）

#### T6.1 包 README

- [x] `packages/doc-editor/README.md`：用法示例、props 文档、自定义扩展、上传 handler 接入

预估：1.5h

#### T6.2 tech 文档：编辑器选型

- [ ] `docs/tech/10-tiptap-editor-selection.md`：技术选型对比表 + 决策记录
- [ ] 更新 `docs/tech/` 索引

预估：1h

#### T6.3 会话日志

- [ ] `.codebuddy/memory/YYYY-MM-DD.md`

预估：0.5h

#### T6.4 提交 + Verify + Archive

- [ ] `openspec validate next-gen-document-editor`
- [ ] `openspec archive next-gen-document-editor`
- [ ] 验证 4 个 spec 已 sync 到 main specs

预估：1h

---

## 总计

| Phase | 任务数 | 预估 |
|-------|--------|------|
| Phase 1: 包基础设施 | 7 | ~10h |
| Phase 2: 块系统 | 8 | ~22h |
| Phase 3: 交互层 | 6 | ~16h |
| Phase 4: 持久化层 | 5 | ~12h |
| Phase 5: 主站接入 | 8 | ~14h |
| Phase 6: 文档与归档 | 4 | ~4h |
| **总计** | **38** | **~78h（约 10 个工作日）** |

---

## 后续 Change（不在本范围）

| Change | 范围 |
|--------|------|
| `editor-standalone-app` | 把 `@luhanxin/doc-editor` 升级为 `apps/doc-editor/` 独立 Garfish 子应用 |
| `editor-collab` | Yjs 协同编辑 + svc-collab WebSocket 服务 |
| `editor-versioning` | 后端版本快照存储 + 版本对比/回滚 UI |
| `editor-workspace` | 用户创作空间 + 文章模板系统 + 公开分享 |
| `ai-writing-assistant` | AI 续写、改写、摘要生成 |
| `editor-mobile` | 移动端编辑器交互优化 |
