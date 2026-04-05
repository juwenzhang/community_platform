## 任务拆分

### Phase 1: monorepo 结构 + core 包基础

#### Task 1.1: 创建 monorepo 结构

**描述**: 创建 packages/md-parser monorepo 结构

**命令**:
```bash
mkdir -p packages/md-parser/packages/{core,react,vue}/src
cd packages/md-parser
pnpm init
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml
```

**验收标准**:
- [ ] monorepo 目录结构创建完成
- [ ] pnpm-workspace.yaml 配置正确
- [ ] 各子包 package.json 创建完成

**预估时长**: 1h

---

#### Task 1.2: 创建 core 包基础结构

**描述**: 创建 core 包基础文件

**文件**:
- `packages/core/package.json` — name: @luhanxin/md-parser-core
- `packages/core/tsconfig.json` — extends tsconfig.base.json
- `packages/core/src/index.ts` — 导出所有公共 API

**验收标准**:
- [ ] core 包结构创建完成
- [ ] TypeScript 配置正确
- [ ] 导出 API 清晰

**预估时长**: 1h

---

#### Task 1.3: 实现核心解析器

**描述**: 实现 Markdown → AST 解析

**文件**:
- `packages/core/src/core/parse.ts` — 实现 `parseMarkdown(input: string)` → mdast AST
- `packages/core/src/core/render.ts` — 实现 `renderMarkdown(input: string, options?)` → HTML string
- `packages/core/src/types/ast.ts` — 扩展 mdast 类型定义

**验收标准**:
- [ ] 基础 Markdown + GFM 语法解析正确
- [ ] AST 类型定义完整
- [ ] HTML 渲染正常

**预估时长**: 4h

---

#### Task 1.4: 编写核心解析测试

**描述**: 编写核心解析功能的单元测试

**验收标准**:
- [ ] 基础 Markdown 语法测试通过
- [ ] GFM 语法（表格、任务列表、删除线）测试通过
- [ ] 边界情况处理正确

**预估时长**: 2h

---

### Phase 2: WASM Worker 架构

#### Task 2.1: 创建 Worker 基础结构

**描述**: 创建 Web Worker 基础架构

**文件**:
- `packages/core/src/worker/index.ts` — Worker 入口和通信协议
- `packages/core/src/worker/types.ts` — Worker 消息类型定义

**验收标准**:
- [ ] Worker 实例可正确创建
- [ ] 主线程和 Worker 通信正常
- [ ] 消息序列化/反序列化正确

**预估时长**: 3h

---

#### Task 2.2: 实现大文档解析 Worker

**描述**: 将大文档 AST 解析移入 Worker

**文件**:
- `packages/core/src/worker/parse.ts` — Worker 中的解析逻辑

**验收标准**:
- [ ] 文档 > 5000 字时自动启用 Worker
- [ ] Worker 解析结果与主线程一致
- [ ] 性能提升明显（不阻塞 UI）

**预估时长**: 4h

---

#### Task 2.3: 实现 Shiki 高亮 Worker

**描述**: 将 Shiki 代码高亮移入 Worker

**文件**:
- `packages/core/src/worker/highlight.ts` — Worker 中的 Shiki 高亮逻辑

**验收标准**:
- [ ] 代码块 > 5 个时自动启用 Worker
- [ ] 高亮结果正确
- [ ] 不阻塞主线程

**预估时长**: 4h

---

#### Task 2.4: 实现 Mermaid 渲染 Worker

**描述**: 将 Mermaid 图表渲染移入 Worker

**文件**:
- `packages/core/src/worker/mermaid.ts` — Worker 中的 Mermaid 渲染逻辑

**验收标准**:
- [ ] Mermaid 图表始终在 Worker 中渲染
- [ ] 渲染结果正确（SVG）
- [ ] 超时回退机制正常

**预估时长**: 4h

---

#### Task 2.5: Worker 性能测试

**描述**: 测试 Worker 性能提升

**验收标准**:
- [ ] 1w 字文档解析时间 < 100ms（Worker）
- [ ] 10 个代码块高亮时间 < 150ms（Worker）
- [ ] 复杂 Mermaid 图表渲染时间 < 500ms（Worker）
- [ ] 主线程不阻塞（FPS > 55）

**预估时长**: 2h

---

### Phase 3: 自定义语法插件

#### Task 3.1: 实现 @用户提及插件

**描述**: 实现用户提及语法解析

**文件**:
- `packages/core/src/plugins/remark-mention.ts` — 解析 `@username` 为 MentionNode

**验收标准**:
- [ ] `@username` 正确解析为 MentionNode
- [ ] 避免与邮箱地址冲突
- [ ] 支持中文用户名

**预估时长**: 2h

---

#### Task 3.2: 实现 #标签插件

**描述**: 实现标签/引用语法解析

**文件**:
- `packages/core/src/plugins/remark-hashtag.ts` — 解析 `#tag` 为 HashtagNode

**验收标准**:
- [ ] `#tag` 正确解析为 HashtagNode
- [ ] 不与 Markdown 标题 `#` 冲突
- [ ] 支持中英文标签

**预估时长**: 2h

---

#### Task 3.3: 实现 ::: 容器插件

**描述**: 实现自定义容器语法解析

**文件**:
- `packages/core/src/plugins/remark-container.ts` — 解析 `:::tip/warning/info/danger`

**验收标准**:
- [ ] 四种容器类型正确解析
- [ ] 支持嵌套内容
- [ ] 支持自定义标题

**预估时长**: 3h

---

#### Task 3.4: 注册插件到解析 pipeline

**描述**: 将自定义插件集成到解析流程

**验收标准**:
- [ ] 插件正确注册
- [ ] 解析 pipeline 正常工作
- [ ] 插件顺序合理

**预估时长**: 1h

---

### Phase 4: TOC / 纯文本 / 元数据提取

#### Task 4.1: 实现 TOC 提取

**描述**: 从 AST 提取标题层级生成目录

**文件**:
- `packages/core/src/core/extract-toc.ts`
- `packages/core/src/types/toc.ts`

**验收标准**:
- [ ] 标题层级正确识别
- [ ] 锚点 ID 生成正确
- [ ] 嵌套结构正确

**预估时长**: 3h

---

#### Task 4.2: 实现纯文本提取

**描述**: 从 AST 提取纯文本（用于搜索）

**文件**:
- `packages/core/src/core/extract-text.ts`

**验收标准**:
- [ ] 跳过代码块
- [ ] 保留文本内容
- [ ] 去除 HTML 标签

**预估时长**: 2h

---

#### Task 4.3: 实现元数据提取

**描述**: 解析 frontmatter + 提取文章元数据

**文件**:
- `packages/core/src/core/extract-meta.ts`
- `packages/core/src/types/meta.ts`

**验收标准**:
- [ ] frontmatter 解析正确
- [ ] 从 h1 提取标题
- [ ] 统计字数/阅读时间

**预估时长**: 3h

---

### Phase 5: XSS 防护

#### Task 5.1: 实现 sanitize schema

**描述**: 自定义 XSS 防护规则

**文件**:
- `packages/core/src/sanitize/schema.ts`

**验收标准**:
- [ ] 允许 shiki 高亮 HTML
- [ ] 允许 mermaid SVG
- [ ] 允许 katex 元素
- [ ] 过滤危险标签和属性

**预估时长**: 3h

---

#### Task 5.2: 编写 XSS 防护测试

**描述**: 测试 XSS 防护有效性

**验收标准**:
- [ ] 脚本注入被过滤
- [ ] 事件属性被过滤
- [ ] iframe 被过滤
- [ ] expression 被过滤

**预估时长**: 2h

---

### Phase 6: React 渲染组件

#### Task 6.1: 创建 React 包基础结构

**描述**: 创建 react 包基础文件

**文件**:
- `packages/react/package.json` — name: @luhanxin/md-parser-react
- `packages/react/tsconfig.json`
- `packages/react/src/index.ts`

**验收标准**:
- [ ] react 包结构创建完成
- [ ] 依赖 @luhanxin/md-parser-core

**预估时长**: 1h

---

#### Task 6.2: 实现 useMarkdown Hook

**描述**: 实现 Markdown 解析 Hook

**文件**:
- `packages/react/src/hooks/useMarkdown.ts`

**验收标准**:
- [ ] 返回 html/toc/meta/loading/error
- [ ] 自动处理 Worker 通信
- [ ] 支持 SSR fallback

**预估时长**: 3h

---

#### Task 6.3: 实现 MarkdownRenderer 组件

**描述**: 实现主渲染组件

**文件**:
- `packages/react/src/MarkdownRenderer.tsx`

**验收标准**:
- [ ] 渲染 HTML 正确
- [ ] 支持 className 自定义
- [ ] 支持 toc-ready 回调
- [ ] 支持 loading/error 状态

**预估时长**: 3h

---

#### Task 6.4: 实现自定义组件

**描述**: 实现代码块、容器、提及等组件

**文件**:
- `packages/react/src/components/CodeBlock.tsx`
- `packages/react/src/components/MermaidDiagram.tsx`
- `packages/react/src/components/CustomContainer.tsx`
- `packages/react/src/components/Mention.tsx`
- `packages/react/src/components/Hashtag.tsx`

**验收标准**:
- [ ] 代码块支持语言标签、行号、复制按钮
- [ ] Mermaid 图表支持 loading/error 状态
- [ ] 容器样式正确
- [ ] 提及/标签链接正确

**预估时长**: 6h

---

#### Task 6.5: 实现 React 样式

**描述**: 实现 React 组件样式

**文件**:
- `packages/react/src/styles/index.module.less`

**验收标准**:
- [ ] Markdown 基础样式
- [ ] 代码块样式
- [ ] 容器样式
- [ ] Mermaid/KaTeX 样式

**预估时长**: 3h

---

### Phase 7: Vue 渲染组件

#### Task 7.1: 创建 Vue 包基础结构

**描述**: 创建 vue 包基础文件

**文件**:
- `packages/vue/package.json` — name: @luhanxin/md-parser-vue
- `packages/vue/tsconfig.json`
- `packages/vue/src/index.ts`

**验收标准**:
- [ ] vue 包结构创建完成
- [ ] 依赖 @luhanxin/md-parser-core

**预估时长**: 1h

---

#### Task 7.2: 实现 useMarkdown Composable

**描述**: 实现 Markdown 解析 Composable

**文件**:
- `packages/vue/src/composables/useMarkdown.ts`

**验收标准**:
- [ ] 返回 html/toc/meta/loading/error
- [ ] 自动处理 Worker 通信
- [ ] 支持 SSR fallback

**预估时长**: 3h

---

#### Task 7.3: 实现 MarkdownRenderer 组件

**描述**: 实现主渲染组件

**文件**:
- `packages/vue/src/MarkdownRenderer.vue`

**验收标准**:
- [ ] 渲染 HTML 正确
- [ ] 支持 className prop
- [ ] 支持 toc-ready 事件
- [ ] 支持 loading/error 状态

**预估时长**: 3h

---

#### Task 7.4: 实现自定义组件

**描述**: 实现代码块、容器、提及等组件

**文件**:
- `packages/vue/src/components/CodeBlock.vue`
- `packages/vue/src/components/MermaidDiagram.vue`
- `packages/vue/src/components/CustomContainer.vue`
- `packages/vue/src/components/Mention.vue`
- `packages/vue/src/components/Hashtag.vue`

**验收标准**:
- [ ] 代码块支持语言标签、行号、复制按钮
- [ ] Mermaid 图表支持 loading/error 状态
- [ ] 容器样式正确
- [ ] 提及/标签链接正确

**预估时长**: 6h

---

#### Task 7.5: 实现 Vue 样式

**描述**: 实现 Vue 组件样式

**文件**:
- `packages/vue/src/styles/index.module.css`

**验收标准**:
- [ ] Markdown 基础样式
- [ ] 代码块样式
- [ ] 容器样式
- [ ] Mermaid/KaTeX 样式

**预估时长**: 3h

---

### Phase 8: 集成与迁移

#### Task 8.1: 替换主站 MarkdownRender

**描述**: 在主站中使用 md-parser-react

**验收标准**:
- [ ] `apps/main` 中替换 react-markdown
- [ ] 文章详情页渲染正常
- [ ] 文章编辑器预览正常

**预估时长**: 3h

---

#### Task 8.2: 在管理后台中使用 md-parser-vue

**描述**: 在管理后台中使用 md-parser-vue

**验收标准**:
- [ ] `apps/admin` 中集成 md-parser-vue
- [ ] 文章预览渲染正常
- [ ] 评论预览渲染正常

**预估时长**: 2h

---

#### Task 8.3: 配置 Vite 优化

**描述**: 配置 shiki WASM 预加载、mermaid/katex 延迟加载

**验收标准**:
- [ ] shiki WASM 预加载正常
- [ ] mermaid 延迟加载正常
- [ ] 包体积优化

**预估时长**: 2h

---

#### Task 8.4: 验证所有现有文章渲染

**描述**: 检查所有现有文章渲染正常

**验收标准**:
- [ ] GFM 语法渲染正常
- [ ] 代码块高亮正常
- [ ] 表格渲染正常
- [ ] 无样式错误

**预估时长**: 2h

---

### Phase 9: 文档与测试

#### Task 9.1: 编写包 README

**描述**: 编写 core/react/vue 三个包的 README

**验收标准**:
- [ ] API 文档清晰
- [ ] 使用示例完整
- [ ] 插件列表完整

**预估时长**: 3h

---

#### Task 9.2: 编写自定义语法文档

**描述**: 编写 mention/hashtag/container 的使用说明

**验收标准**:
- [ ] 语法说明清晰
- [ ] 示例完整

**预估时长**: 2h

---

#### Task 9.3: 更新 tech 文档索引

**描述**: 更新 `docs/tech/` 文档索引表

**验收标准**:
- [ ] 新增 unified 生态选型文档
- [ ] 新增 WASM Worker 架构文档
- [ ] 索引表更新

**预估时长**: 1h

---

## 总计

- **core 包开发**: ~25h
- **Worker 架构**: ~17h
- **React 包开发**: ~16h
- **Vue 包开发**: ~16h
- **集成与迁移**: ~9h
- **文档与测试**: ~6h
- **总时长**: ~89h（约 11 个工作日）
