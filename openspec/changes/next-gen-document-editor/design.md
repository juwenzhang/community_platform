## Context

### 现状

`apps/main/src/components/ArticleEditor/index.tsx`（已读源码）是一个 **textarea + 实时 Markdown 预览** 的 311 行组件，特性：

- 用 `useState` 管理 `title / content / tags / status / categories`
- textarea 内手写 Markdown 标记
- `MarkdownRender` 在右侧分栏实时渲染
- 内置部分键盘快捷键（Cmd+B/I/K，Tab 缩进，Enter 续列表前缀）
- 通过 `onSave` 回调向上传递 `{ title, content, ... }`，由父组件调用 `useArticleStore.updateArticle`

### 上下文边界

| 已沉淀 | 不动 | 本 change 提供 |
|--------|------|---------------|
| `@luhanxin/md-parser-react`（只读渲染）| `@luhanxin/md-parser-*` 全系列 API | `@luhanxin/doc-editor` 编辑态包 |
| `useArticleStore.updateArticle`（保存能力）| 后端 Proto + DB schema | `<DocEditor>` 替换 textarea |
| `apps/main/src/pages/post/pages/edit/`（编辑页路由）| 现有上传 Gateway（如有）| IndexedDB 草稿层 |

### 技术挑战

1. **块编辑器框架选型** — TipTap vs Slate vs Lexical vs ProseMirror 原生
2. **Markdown 双向转换的保真度** — 自定义块（容器、Mermaid）如何与 Markdown 互转
3. **草稿与服务端版本的协调** — 离线编辑、跨设备一致性、防覆盖
4. **代码高亮的两套机制** — 编辑态用 lowlight（轻量同步），只读态用 Shiki（重量异步）
5. **首屏体积控制** — TipTap + 扩展容易超过 300KB

## Goals / Non-Goals

### Goals

1. **块编辑器**：段落/标题/列表/任务列表/引用/代码块/图片/表格/分隔线/数学公式/Mermaid/容器（tip/warning/info/danger）
2. **Slash 命令**：`/` 触发面板，搜索/键盘选择/插入块
3. **Bubble Menu**：选区浮层（粗体/斜体/链接/行内代码/删除线）
4. **Floating Menu**：空行行首浮层（快速插入块）
5. **Markdown 快捷键**：`#` `>` `---` ` ``` ` 等自动转换
6. **拖拽排序块** + 块级操作（删除/复制/上下移）
7. **Markdown ↔ JSON 双向转换**，保证 round-trip 等价（在已支持语法子集内）
8. **IndexedDB 草稿** + 防抖自动保存 + 保存状态指示
9. **主站接入**：替换 `apps/main/src/components/ArticleEditor/`

### Non-Goals

- 协同编辑、版本快照、模板、AI 续写、内联评论、移动端 UI（均为独立 change）
- 后端改造（Proto/DB/handler 不动）
- 自定义渲染引擎（编辑态 ProseMirror DOM 已足够）
- 现有文章迁移脚本（编辑器加载时 `markdownToJSON` 即可）

## Decisions

### Decision 1: 编辑器框架 — 选择 TipTap v2

| 候选 | 优势 | 劣势 |
|------|------|------|
| **TipTap v2** | ProseMirror 封装、官方扩展生态最丰富、React 集成成熟、Yjs 适配（为协同 change 留口）、文档质量高 | 包体积偏大（核心 ~80KB gzip）、API 抽象一层有学习成本 |
| Slate.js | React 原生、轻量（~50KB） | 块编辑生态弱、协同需自建、复杂场景 bug 多 |
| Lexical（Meta）| 高性能、可插拔 | 生态新、文档不全、Markdown 双向转换需自建 |
| ProseMirror 原生 | 最灵活、最稳定 | API 巨复杂、React 集成需自建 |

**选择 TipTap v2**。理由：
1. ProseMirror 是块编辑器领域的事实标准（飞书、Notion、Atlassian 均基于它）
2. 官方扩展（`@tiptap/extension-*`）覆盖 80% 需求，剩余自定义扩展模式清晰
3. Yjs 适配器 `@hocuspocus/extension-collaboration` 成熟，未来协同 change 直接接入
4. 社区案例多（如 Outline、Plane、AppFlowy 都用 TipTap），踩坑少

### Decision 2: 包名 — `@luhanxin/doc-editor`

不用 `@luhanxin/editor`（过于宽泛，未来若有代码编辑器、SQL 编辑器等会冲突）。`doc-editor` 明确表达「文档编辑器」职责。

### Decision 3: 数据交换格式 — Markdown 字符串（不引入 JSON 字段）

**选择**：编辑器**输入** Markdown 字符串、**输出** Markdown 字符串。内部 ProseMirror JSON 仅作为运行时表示，不持久化到后端。

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. 仅 Markdown（采纳）** | 后端零变更；与 md-parser-react 只读渲染天然一致；现有文章无需迁移 | 自定义块（如 Mermaid 复杂样式属性）需通过 Markdown 扩展语法承载 |
| B. 双字段（content_md + content_json）| 保真度高 | 后端需新字段；与 article-storage-optimization 抢占 schema；旧文章需补 JSON |
| C. 仅 JSON | 编辑器原生 | 后端 API 大改；md-parser 无法消费 |

**理由**：
- **不增加后端复杂度** — 后端继续存 Markdown，搜索、AST 提取、AI 摘要的现有方案不动
- **复用 md-parser** — 详情页直接用 `<MarkdownRenderer content={article.content} />`，编辑/只读两侧同源
- **草稿层除外** — IndexedDB 草稿存 ProseMirror JSON（避免来回转换损耗），保存时再序列化为 Markdown

### Decision 4: Markdown 转换器选型 — 自研 + 复用 md-parser-core

| 转换方向 | 实现 |
|----------|------|
| **Markdown → ProseMirror JSON** | 复用 `@luhanxin/md-parser-core` 的 `parseMarkdownToAst` 拿到 mdast，自研 `mdastToProseMirror.ts` 映射到 PM JSON |
| **ProseMirror JSON → Markdown** | 自研 `proseMirrorToMarkdown.ts` 序列化器（参考 `prosemirror-markdown` 但适配自定义块） |

**为什么不直接用 `prosemirror-markdown`**：
- 不支持自定义块（容器、Mermaid）
- 不支持 GFM 子集（任务列表、表格的部分语法）
- 与 md-parser-core 的 mdast 表示不一致，会出现「编辑器解析的 AST」≠「只读渲染解析的 AST」的诡异问题

**保真原则**：
- **完全保真**：标题、段落、列表、引用、行内格式、链接、图片、代码块、表格、分隔线
- **扩展语法保真**：tip/warning/info/danger 容器（用 `:::` 语法）、@mention、#hashtag
- **有损警告**：HTML 内嵌、未知扩展节点 —— 转换时弹出警告并保留原文

### Decision 5: 代码高亮 — 编辑态 lowlight，只读态 Shiki

| 场景 | 工具 | 理由 |
|------|------|------|
| **编辑态** | `@tiptap/extension-code-block-lowlight` + `lowlight` | 同步、轻量（~30KB），输入时实时高亮无延迟 |
| **只读态** | `@luhanxin/md-parser-core` 的 Shiki Worker | 美观度高、TextMate 语法完整，但需异步 |

**对齐方案**：lowlight 与 Shiki 共用 `github-light` / `github-dark` 主题色 token，视觉差异最小化。

**注册语言**：编辑器只注册常用 20 种（rust/ts/js/python/go/java/kotlin/swift/c/cpp/sh/yaml/json/toml/sql/html/css/markdown/dockerfile/nginx），减少包体积。其他语言走「插入后切换语言」时按需 dynamic import。

### Decision 6: Slash 命令架构 — 基于 `@tiptap/suggestion`

```
用户输入 "/"
  → @tiptap/suggestion 触发 onStart（注册了 "/" 触发字符）
  → 渲染 SlashCommandPalette（tippy.js 浮层）
  → 用户输入过滤词 → onUpdate 重新过滤命令列表
  → 键盘上下选择 / 鼠标点击
  → 选中命令 command(props) 执行（插入对应块）
  → onExit 卸载浮层
```

**命令注册**：

```typescript
interface SlashCommand {
  id: string;
  title: string;        // "代码块"
  description: string;  // "插入带语法高亮的代码块"
  icon: ReactNode;
  keywords: string[];   // ["code", "代码", "```"]
  group: 'basic' | 'media' | 'advanced';
  command: (props: { editor: Editor; range: Range }) => void;
}
```

**默认命令**（约 15 个）：
- 基础：H1/H2/H3、引用、分隔线、有序/无序列表、任务列表
- 媒体：图片、代码块、表格
- 高级：数学公式、Mermaid、容器（tip/warning/info/danger）

**未来扩展**：通过 `<DocEditor extraSlashCommands={...}>` prop 让消费方追加自定义命令（为后续 AI 写作 change 留口）。

### Decision 7: 自动保存策略

```
┌──────────────────────────────────────────────────────────┐
│  用户输入                                                 │
│     ↓                                                    │
│  Editor onUpdate 事件                                     │
│     ↓                                                    │
│  防抖 800ms（避免每个键击都触发）                          │
│     ↓                                                    │
│  写 IndexedDB 草稿（PM JSON 格式，不转 Markdown）          │
│     ↓                                                    │
│  状态指示：「正在保存... → 已保存到本地」                   │
│                                                          │
│  另有定时器（每 30s）：                                    │
│     ↓                                                    │
│  序列化 PM JSON → Markdown                                │
│     ↓                                                    │
│  调用 useArticleStore.updateArticle({ content: md })      │
│     ↓                                                    │
│  状态指示：「已同步到云端 · HH:MM」                         │
└──────────────────────────────────────────────────────────┘
```

**关键决策**：
- **本地保存（IndexedDB）防抖 800ms** — 平衡「不丢内容」与「不卡顿」
- **远程保存定时 30s** — 减少后端写入频率，避免高频请求
- **本地存 PM JSON，远程存 Markdown** — 本地保留编辑器原生格式（恢复时无解析损耗），远程保持后端契约
- **手动保存按钮** — 强制立即同步（防抖+定时全部跳过）

### Decision 8: 草稿与服务端的关系（不引入版本概念）

**草稿生命周期**：

| 触发 | 行为 |
|------|------|
| 编辑器挂载（编辑现有文章）| 优先读 IndexedDB 草稿；若草稿 `updatedAt > article.updatedAt`，提示「检测到本地未保存草稿，是否恢复？」 |
| 编辑器挂载（新建文章）| 读 IndexedDB 中 `articleId === null` 的最近草稿（如有）|
| 内容变化 | 防抖写 IndexedDB |
| 30s 定时 | 同步到服务端 |
| 手动「保存」按钮 | 立即同步到服务端 |
| 服务端保存成功 | 删除对应 IndexedDB 草稿 |
| 用户关闭编辑器（未保存）| IndexedDB 草稿保留 |
| IndexedDB 中草稿 > 30 天 | 启动时自动清理 |

**不做**：跨设备草稿同步（属于服务端版本快照范畴，不在本 change）。

### Decision 9: 保存冲突处理 — 乐观锁 + 409 + 用户选择

`Article.updated_at` 字段已存在（见 `proto/luhanxin/community/v1/article.proto`），作为乐观锁基础。规则：

```
保存时携带 article.updatedAt
  ↓
后端校验 updatedAt 是否匹配 DB 中值
  ↓
匹配 → 接受写入，返回新 updatedAt
  ↓
不匹配 → 返回 409 Conflict + 最新服务端版本
  ↓
前端弹窗：「服务端有更新版本（HH:MM），是否：
           [查看差异] [覆盖保存（保留本地）] [放弃本地修改]」
```

**「查看差异」** 弹出并排 diff 视图，用户可逐段选择保留本地还是远程，合并后保存。作为 v0.1.0 可仅支持「覆盖 / 放弃」两个按钮，「查看差异」作为 v0.2.0 迭代。

**注意**：本决策需要后端 `UpdateArticle` RPC 支持 updated_at 乐观锁校验。如后端当前未支持，本 change 的 Phase 5 需要追加一个小任务给 `svc-content` 补上；如成本较高则降级为「纯前端 last-write-wins + 提示」。**归档时会根据实施情况在 COMPLETION_REPORT 中说明**。

### Decision 10: 不引入虚拟列表 / Canvas / WebGL 渲染

ProseMirror 自带 viewport 优化（`viewportMargin`），编辑态 1w 字以内 DOM 渲染足够。**编辑态超大文档（5w 字+）属于极端场景，不在本 change 优化范围**。

只读态的渲染优化由 `md-parser-core` 的渲染引擎分级负责（已在 spec 中沉淀）。

### Decision 11: 包结构

```
packages/doc-editor/
├── package.json                    # @luhanxin/doc-editor
├── tsconfig.json
├── tsup.config.ts                  # 库构建（external 化 React/TipTap 不友好，先全打）
├── src/
│   ├── index.ts                    # 公共 API 导出
│   ├── core/
│   │   ├── createEditor.ts         # 工厂：返回配置好的 Editor 实例
│   │   ├── extensions.ts           # 默认扩展集合（基础 + 自定义块）
│   │   ├── schema-config.ts        # 自定义节点 spec 注册
│   │   └── keymap.ts               # 自定义快捷键
│   ├── blocks/
│   │   ├── code-block/
│   │   │   ├── CodeBlock.ts        # TipTap 扩展定义
│   │   │   └── CodeBlockView.tsx   # NodeView（语言选择器、复制按钮）
│   │   ├── image/
│   │   │   ├── Image.ts
│   │   │   ├── ImageView.tsx       # NodeView（上传、resize、alt 编辑）
│   │   │   └── upload.ts           # 上传适配器（接入项目上传服务）
│   │   ├── mermaid/
│   │   │   ├── Mermaid.ts
│   │   │   └── MermaidView.tsx     # NodeView（编辑/预览切换）
│   │   ├── math/
│   │   │   ├── InlineMath.ts
│   │   │   ├── BlockMath.ts
│   │   │   └── MathView.tsx        # KaTeX 渲染
│   │   ├── container/
│   │   │   ├── Container.ts        # tip/warning/info/danger
│   │   │   └── ContainerView.tsx
│   │   ├── table/                  # 复用 @tiptap/extension-table，仅做样式
│   │   ├── task-list/              # 复用 @tiptap/extension-task-list
│   │   └── index.ts
│   ├── slash/
│   │   ├── SlashCommand.ts         # @tiptap/suggestion 集成
│   │   ├── SlashPalette.tsx        # 浮层 UI
│   │   ├── commands.ts             # 默认命令列表
│   │   └── types.ts
│   ├── menu/
│   │   ├── BubbleMenu.tsx          # 选区浮层
│   │   ├── FloatingMenu.tsx        # 空行浮层
│   │   └── BlockHandle.tsx         # 块级拖拽手柄 + 操作按钮
│   ├── convert/
│   │   ├── markdownToJson.ts       # Markdown → PM JSON（基于 md-parser-core 的 mdast）
│   │   ├── jsonToMarkdown.ts       # PM JSON → Markdown
│   │   ├── mdast-bridge.ts         # mdast ↔ PM 节点映射表
│   │   └── __tests__/
│   │       └── round-trip.test.ts  # 双向转换等价性测试
│   ├── autosave/
│   │   ├── DraftStore.ts           # IndexedDB 封装（基于 idb）
│   │   ├── useAutosave.ts          # React hook：防抖 + 定时
│   │   ├── SaveStatusIndicator.tsx # UI：「已保存到本地 / 已同步」
│   │   └── types.ts
│   ├── react/
│   │   ├── DocEditor.tsx           # 主组件
│   │   ├── useDocEditor.ts         # 暴露 editor 实例的 hook
│   │   └── DocEditorProvider.tsx   # Context（注入 upload handler 等）
│   ├── adapters/
│   │   └── cloudinary-upload.ts    # 默认 Cloudinary upload handler 实现
│   ├── styles/                     # 不打包 CSS（参考 md-parser，theme 待 polish）
│   └── types/
│       ├── index.ts
│       ├── command.ts
│       ├── upload.ts
│       └── editor.ts
└── README.md
```

### Decision 12: 架构留口 — 为未来独立应用化做准备

本 change 交付 `packages/doc-editor/` 共享包，但包的 API 设计**严格遵循"不耦合宿主"原则**：

| 约束 | 理由 |
|------|------|
| 不直接 import `apps/main/src/stores/*` | Upload/Save 等副作用全部通过 props 或 Provider 注入 |
| 不依赖宿主 antd 主题变量 | 包内样式用 CSS 变量定义并提供默认值，宿主可覆盖 |
| 不绑定特定 i18n 框架 | 通过 `locale` prop 接收已翻译好的文案字典 |
| 不直接读 `localStorage.getItem('luhanxin_auth_token')` | 鉴权凭证通过 upload handler 的闭包或 Provider 注入 |
| 输出物是纯 Markdown 字符串 | 不耦合任何业务模型，任何 app 都能消费 |

**两步走路线**：

```
阶段 1（本 change）: packages/doc-editor/ 共享包
  → 主站 lazy import 消费
  → 评论、wiki 等次要场景未来陆续接入
  ↓
升级触发条件（任一成立）:
  (a) 编辑器场景 ≥ 3 个
  (b) 产品需要独立域名 editor.luhanxin.com
  (c) 协同编辑 change 启动（独立 WebSocket 连接更自然）
  ↓
阶段 2（未来 change editor-standalone-app）: apps/doc-editor/ 独立 Garfish 子应用
  → 新建 apps/doc-editor/，内部 `import { DocEditor } from '@luhanxin/doc-editor'`
  → 配置自己的路由、国际化、主题
  → 在 main 中通过 Garfish 加载（复用 app-registry）
  ↓
阶段 3（产品成熟）: editor.luhanxin.com 独立站点
```

**本 change 的每个模块都要问自己"独立 app 能直接用吗？"** —— 这是 review 时的隐式验收。

### Decision 13: 图片处理"自建"方向（Cloudinary 定位为纯存储）

经确认，平台方向是**自建图片处理管线**，Cloudinary 仅作为"存储 + CDN 分发"使用，**不依赖其 URL 变换（f_auto、l_text、w_auto 等）**。

**本 change 内不承担这部分工作**，仅在 Image 块（T2.2）的 `UploadHandler` 接口层做好约束，为未来的 `self-hosted-image-pipeline` change 留口：

```typescript
interface UploadHandler {
  // 接受可能已经被客户端处理过的 File（WebP 转码、加水印、EXIF 剥离）
  // 也接受多尺寸版本数组（480w/800w/1200w/1920w）
  upload(
    file: File | File[],
    opts?: { folder?: string; metadata?: Record<string, unknown> }
  ): Promise<UploadResult>;
}

interface UploadResult {
  url: string;               // 主 URL（默认尺寸）
  srcset?: string;            // 响应式 srcset（多尺寸上传时）
  lqip?: string;              // Low Quality Image Placeholder (base64)
  alt?: string;
}
```

**本 change 阶段 Image 块行为**：
- 接入 `createCloudinaryUploadHandler`，直传原图到 Cloudinary（**不做转码、不加水印、不做审核**）
- 这是"能用"版本，图片质量和合规性由未来 change 完善

**未来 `self-hosted-image-pipeline` change 范围**：
- 前端 WebP 转码（Canvas + OffscreenCanvas + Web Worker）
- 多尺寸生成（480/800/1200/1920）+ srcset 渲染
- EXIF 剥离（Canvas 重绘副产品）
- Canvas 水印合成：`@{username}@luhanxin-community`，默认开 + 用户可关
- LQIP 模糊占位（20×15 JPEG base64）
- NSFW.js 前端 L1 审核（dynamic import 1.4MB 模型）
- 统一升级 AvatarUpload 和编辑器 Image 块

平台名不硬编码，通过 `import.meta.env.VITE_PLATFORM_NAME`（默认 `luhanxin-community`）提供。

### Decision 14: 两种编辑器定位 — 站内文章编辑 vs 未来独立文档站

经确认，`/post/:id/edit` 和 `/editor/:docId` 是**两个不同的产品形态**，不做路由重定向：

| 维度 | 站内文章编辑 | 独立文档站（未来） |
|------|--------------|------------------|
| 路由 | `/post/:id/edit`（apps/main 内） | `editor.luhanxin-community.xxx` 独立站点 |
| 承载包 | `apps/main` | `apps/doc-editor/`（Garfish 子应用 + 独立域名）|
| 产品定位 | 发布社区文章 | 个人知识库 / 飞书文档级富文档 |
| 存储 schema | `articles`（保持不变） | 新 `documents` schema（public/private/unlisted visibility）|
| 发布到平台 | — | ✅ 「发布为文章」按钮 → 调 article API 同步 content |
| 编辑器实现 | 本 change 的 `@luhanxin/doc-editor` | 同一个 `@luhanxin/doc-editor`（复用） |
| 用户定位 | 内容作者 | 知识工作者 |

**关键判断**：二者共用编辑器**能力层**（同一个包），但**产品层面独立**，互相不通过路由重定向耦合。

类比：
- 飞书主站 + `docs.feishu.cn`
- 语雀内容社区 + 语雀文档工作台
- Notion 站点 + Notion 嵌入

**本 change 范围**：仅做站内文章编辑器升级。

**不做**：
- ~~`/editor/:docId` 路由别名~~
- ~~`/post/:id/edit` → `/editor/:docId` 的 301 重定向~~
- 独立文档站 app

**未来 `editor-standalone-app` change 范围**：
- 新建 `apps/doc-editor/` 独立 Garfish 子应用
- 新建 `documents` schema + `DocumentService` Proto + svc-content 补充 handler
- 新增「发布到平台」流程：`document → article` 单向同步
- 文档可见性：`public / private / unlisted`
- 独立域名部署

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| TipTap + 扩展 + lowlight 包体积超 300KB | 编辑页首屏慢 | 路由级 lazy import；lowlight 只注册 20 种语言 |
| Markdown 双向转换损耗（如 HTML 内嵌、罕见扩展）| 用户编辑后内容失真 | round-trip 测试覆盖；遇到不支持节点弹「保留原文」警告 |
| 编辑态 lowlight 与只读态 Shiki 视觉差异 | 视觉不一致体验 | 共用 github-light/dark token；polish change 中验收 |
| IndexedDB 浏览器配额（约 50% 磁盘空间，最少 10MB）| 大量草稿堆积 | 30 天自动清理；草稿数 > 50 时清理最老的 |
| 移动端编辑器交互（Slash 浮层、拖拽手柄）| 移动端体验差 | 本 change 不做移动端，PC 优先 |
| 自定义块（Mermaid/容器）的 Markdown 表示扩展 | 与 CommonMark 不兼容，离开本平台失真 | 使用 `:::` 容器语法（remark 生态约定俗成）；导出时可选「兼容模式」剥离扩展 |
| 与 `markdown-parser-polish` 的接入时序 | polish 未做完时编辑器已上线，详情页样式未对齐 | 两个 change 并行推进，polish 优先完成 theme 抛光，编辑器接入时同时受益 |

## Migration Plan

### Phase 顺序

```
Phase 1 (基础设施)         → 包结构、Editor 工厂、基础扩展、Markdown 转换器（先跑通最小闭环）
       ↓
Phase 2 (块系统)           → 自定义块（代码块/图片/容器/Mermaid/数学公式）
       ↓
Phase 3 (交互)             → Slash 命令、Bubble Menu、Floating Menu、块拖拽
       ↓
Phase 4 (持久化)           → IndexedDB 草稿、自动保存、状态指示
       ↓
Phase 5 (主站接入)         → 重写 ArticleEditor、灰度开关、E2E 测试
       ↓
Phase 6 (文档与归档)       → README、tech 文档、归档
```

### 灰度策略

- 新编辑器通过 feature flag（环境变量 `VITE_USE_DOC_EDITOR=1`）启用
- 默认关闭，开发期内 dev 环境开启
- 主站接入完成 + E2E 通过后，prod 环境启用
- 旧 textarea 编辑器保留 1 个迭代周期作为回退

### 兼容性

- 现有 Markdown 文章：编辑器加载时 `markdownToJSON(article.content)`，无需后端配合
- 现有未发布草稿：保留在数据库，编辑器加载时同样转换
- 失败兜底：转换失败时降级为「源码编辑模式」（textarea），保证用户能看到原内容

## Open Questions（需确认）

~~1. **现有上传服务**：`apps/main` 是否已有图片上传 API~~
   - **已解决** ✅：`apps/main/src/components/AvatarUpload/index.tsx` 已实现完整流程：`/api/v1/upload/sign` 拿签名 → 直传 Cloudinary `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload`。编辑器 Image 块直接复用该流程，抽象为 `cloudinaryUploadHandler`。

~~2. **Article 是否有 updated_at 乐观锁**~~
   - **已解决** ✅：`proto/luhanxin/community/v1/article.proto` 定义 `updated_at = 12`。编辑器保存时携带，后端若暂未支持乐观锁校验则降级为 last-write-wins + 前端轮询检测变更。

~~3. **现有文章中是否已有 `:::` 语法等扩展**~~
   - **暂不阻塞**：本 change 默认保留扩展语法，Phase 5.7 的兼容性测试会扫描真实文章；发现问题时按反馈处理。

### 新增待确认（不阻塞启动）

4. **路由形态**：采用 `/editor/:docId` 独立路由，还是保留 `/post/:id/edit`？
   - **决策**：主菜单入口走新路由 `/editor/:docId`，并保留 `/post/:id/edit` 作为 301 重定向。理由：`/editor` 语义更通用，未来独立 app 化可平移；同时保留旧路径避免外部链接失效。

5. **Cloudinary 文件夹命名**：图片上传到哪个 folder？
   - **决策**：`article-images/{articleId 或 draft-uuid}/`。头像已用 `avatars` folder。
