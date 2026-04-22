## ADDED Requirements

### Requirement: 文章编辑路由升级

`apps/main` SHALL 新增 `/editor/:docId` 路由作为文章编辑入口，并保留 `/post/:id/edit` 作为向后兼容重定向。

- `/editor/new` → 新建文章
- `/editor/:docId` → 编辑现有文章
- `/post/:id/edit` → 301 重定向到 `/editor/:id`（外部书签不失效）
- 菜单/按钮「写文章」跳转目标改为 `/editor/new`
- 新路由名更通用，为未来独立应用化（`apps/doc-editor/`）或多种文档类型（wiki/笔记）预留语义

#### Scenario: 新建文章

- **WHEN** 用户访问 `/editor/new`
- **THEN** 编辑器以空白状态加载

#### Scenario: 编辑现有文章

- **WHEN** 用户访问 `/editor/abc123`
- **THEN** 编辑器加载 articleId 为 `abc123` 的文章内容

#### Scenario: 旧路径重定向

- **WHEN** 用户访问 `/post/abc123/edit`
- **THEN** 浏览器 301 跳转到 `/editor/abc123`

---

### Requirement: ArticleEditor 组件升级为块编辑器

`apps/main/src/components/ArticleEditor/` SHALL 从 textarea + 左右分栏 Markdown 预览升级为 `@luhanxin/doc-editor` 块编辑器。

- 保留对外 props 签名不变（`initialTitle / initialContent / initialTags / initialStatus / initialCategories / onSave / onCancel / saving`）
- 内部用 `<DocEditor>` 替换 textarea
- 移除右侧预览面板（块编辑器是 WYSIWYG）
- 保留顶部栏（标题输入、分类、状态、保存按钮、关闭按钮）
- 保留标签输入栏

#### Scenario: 调用方无需修改

- **WHEN** `apps/main/src/pages/post/pages/edit/index.tsx` 现有的 `<ArticleEditor onSave={...} initialContent={...} />` 调用
- **THEN** 升级后的组件在不修改调用代码的前提下正常工作

#### Scenario: 加载现有 Markdown 文章

- **WHEN** `initialContent` 是已存在的 Markdown 字符串
- **THEN** 编辑器调用 `markdownToJson` 转换并显示，无内容丢失

#### Scenario: 保存输出 Markdown

- **WHEN** 用户点击保存
- **THEN** `onSave({ content })` 中 `content` 是序列化后的 Markdown 字符串（与原 textarea 行为一致）

#### Scenario: 移除分栏预览

- **WHEN** 检查升级后的 ArticleEditor
- **THEN** 不存在 `splitPane` / `previewPane` / `MarkdownRender` 引用

---

### Requirement: 自动保存集成

ArticleEditor SHALL 集成 `useAutosave`，实现编辑过程中的本地草稿和远程保存。

- 远程保存通过 `useArticleStore.updateArticle({ id, content, ... })` 完成
- 顶部栏显示 `<SaveStatusIndicator>`
- 新建文章时 `articleId` 为 null，仅本地保存（远程保存待用户首次手动「发布/保存草稿」）

#### Scenario: 编辑现有文章自动保存

- **WHEN** 编辑现有文章超过 30s 且有内容变化
- **THEN** 触发一次 `useArticleStore.updateArticle`，状态指示器显示「已同步 · HH:MM」

#### Scenario: 新建文章不自动远程保存

- **WHEN** 编辑新文章（articleId 为 null）
- **THEN** 仅触发 IndexedDB 草稿保存，不调用 createArticle/updateArticle

#### Scenario: 保存失败显示重试

- **WHEN** 远程保存因网络错误失败
- **THEN** 状态指示器显示「保存失败 · 重试」，点击可重试

---

### Requirement: 灰度开关

主站 SHALL 通过环境变量 `VITE_USE_DOC_EDITOR` 控制新旧编辑器切换，旧 textarea 编辑器作为 legacy 保留至少 1 个迭代。

- `VITE_USE_DOC_EDITOR=1` 启用新编辑器
- 未设置或 `0` 使用 legacy textarea 编辑器
- 开发环境默认开启
- 生产环境默认关闭，验证通过后逐步开启

#### Scenario: 灰度开关关闭

- **WHEN** `VITE_USE_DOC_EDITOR` 未设置或为 `0`
- **THEN** ArticleEditor 仍渲染 textarea + 预览（legacy 行为）

#### Scenario: 灰度开关开启

- **WHEN** `VITE_USE_DOC_EDITOR=1`
- **THEN** ArticleEditor 渲染 `<DocEditor>` 块编辑器

#### Scenario: legacy 文件保留

- **WHEN** 检查 `apps/main/src/components/ArticleEditor/`
- **THEN** 存在 `index.legacy.tsx`（备份的旧实现），新 `index.tsx` 根据开关分发

---

### Requirement: 详情页只读渲染保持不变

文章详情页 `apps/main/src/pages/post/pages/detail/index.tsx` SHALL 继续使用 `<MarkdownRender>`（由 `markdown-parser-polish` change 决定其内部实现），本 change 不修改详情页。

#### Scenario: 详情页文件不变

- **WHEN** 检查 detail 页面源代码
- **THEN** 本 change 未修改 detail 页面文件（除非有评论编辑等子场景需要 DocEditor）

#### Scenario: 编辑保存后详情页正确渲染

- **WHEN** 用户在新编辑器编辑文章并保存
- **THEN** 跳转到详情页，渲染结果与编辑器中所见一致（容器、Mermaid、数学公式等扩展节点正确显示）

---

### Requirement: 现有文章兼容

升级后的编辑器 SHALL 能正确加载和编辑平台已有的所有 Markdown 文章，不引发数据丢失。

兼容性要求：
- 标准 CommonMark + GFM 语法 100% 支持
- `:::` 容器语法支持（与 md-parser-core 对齐）
- 不支持的扩展节点（如平台未定义的 HTML 内嵌）以「保留原文 + 警告」方式降级
- 无任何文章因升级而无法打开

#### Scenario: 已有文章打开

- **WHEN** 用编辑器打开 10 篇平台已发布的真实文章
- **THEN** 全部能正常打开和编辑，内容无丢失

#### Scenario: 不可识别节点降级

- **WHEN** 文章含编辑器无法识别的扩展节点
- **THEN** 节点保留为 raw HTML 块，编辑器顶部提示「检测到 N 个未识别节点，已保留原文」

#### Scenario: 保存后内容等价

- **WHEN** 打开 → 不做任何编辑 → 强制保存
- **THEN** 保存的 Markdown 与原文在规范化（空白、列表标记一致化）后等价

---

### Requirement: 上传 Handler 接入（Cloudinary 直传）

ArticleEditor SHALL 通过 `<DocEditor uploadHandler={...}>` 注入 `createCloudinaryUploadHandler` 返回的 handler，复用平台现有 Cloudinary 签名上传流程。

- 签名接口：`POST /api/v1/upload/sign`（已由 `AvatarUpload` 验证可用）
- JWT 从 `localStorage.getItem('luhanxin_auth_token')` 读取（与现有流程一致）
- 默认 folder：`article-images/{articleId 或 新建草稿 uuid}`
- 不使用 base64 降级（避免污染 Markdown）

#### Scenario: 上传流程复用 AvatarUpload 模式

- **WHEN** 用户在编辑器中拖拽、粘贴或通过菜单上传图片
- **THEN** 调用 `POST /api/v1/upload/sign` 取得签名，然后直传 Cloudinary，成功后插入 `![](secure_url)`

#### Scenario: 未登录时不允许上传

- **WHEN** 用户未登录（localStorage 无 token）
- **THEN** 编辑器阻止上传并提示「请先登录」

---

### Requirement: 依赖清理

升级完成 + 灰度全开后，`apps/main` SHALL 移除已不再使用的 Markdown 相关依赖：

- 编辑器相关：原 ArticleEditor 中用于辅助 textarea 的纯 Markdown 操作工具（如有）
- 注意：详情页仍依赖 markdown 渲染，相关依赖由 `markdown-parser-polish` change 处理

#### Scenario: 灰度全开后依赖检查

- **WHEN** `VITE_USE_DOC_EDITOR=1` 成为默认且 legacy 已废弃
- **THEN** `apps/main/package.json` 不再包含仅 textarea 编辑器使用的依赖

> **注意**：本 change 阶段保留 legacy，依赖也暂时保留；正式废弃 legacy 在后续 cleanup change 中处理。
