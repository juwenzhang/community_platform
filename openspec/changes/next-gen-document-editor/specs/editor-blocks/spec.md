## ADDED Requirements

### Requirement: 基础块覆盖

编辑器 SHALL 至少支持以下基础块类型，每个块都有对应的 PM Node、Markdown 表示、键盘快捷键和 Slash 命令：

| 块类型 | PM Node | Markdown 表示 | 快捷键 |
|--------|---------|--------------|--------|
| 段落 | `paragraph` | （默认）| —— |
| 标题 H1-H6 | `heading` | `#` ~ `######` | `# ` 自动转换 |
| 无序列表 | `bulletList` | `- ` | `- ` 自动转换 |
| 有序列表 | `orderedList` | `1. ` | `1. ` 自动转换 |
| 任务列表 | `taskList` | `- [ ] ` | `- [ ] ` 自动转换 |
| 引用 | `blockquote` | `>` | `> ` 自动转换 |
| 代码块 | `codeBlock` | ` ``` ` | ` ``` ` 自动转换 |
| 分隔线 | `horizontalRule` | `---` | `---` 自动转换 |
| 链接 | mark `link` | `[text](url)` | Cmd+K |
| 图片 | `image` | `![alt](url)` | Slash 命令 |
| 表格 | `table` | GFM 表格 | Slash 命令 |
| 数学行内 | `inlineMath` | `$...$` | Slash / `$` 触发 |
| 数学块 | `blockMath` | `$$...$$` | Slash / `$$` 触发 |
| 容器 | `container` | `:::tip ... :::` | Slash 命令 |
| Mermaid | `mermaid` | ` ```mermaid ... ``` ` | Slash 命令 |

#### Scenario: 标题快捷键

- **WHEN** 在空段落中输入 `## ` 后跟随文本
- **THEN** 段落自动转换为 H2，输入的文本成为标题内容

#### Scenario: 列表续行

- **WHEN** 在列表项末尾按回车
- **THEN** 创建新的同级列表项，光标自动定位到新项

#### Scenario: 退出列表

- **WHEN** 在空列表项中按回车
- **THEN** 退出列表，转为段落

---

### Requirement: 代码块（CodeBlock）

代码块 SHALL 支持语言选择、语法高亮、复制按钮三大能力。

- 基于 `@tiptap/extension-code-block-lowlight`
- lowlight 至少注册 20 种常用语言：rust / typescript / javascript / python / go / java / kotlin / swift / c / cpp / shell / yaml / json / toml / sql / html / css / markdown / dockerfile / nginx
- NodeView 顶部含语言下拉选择器和复制按钮
- 切换语言时高亮立即更新

#### Scenario: 语法高亮渲染

- **WHEN** 创建 `codeBlock` 节点，attrs `{ language: 'rust' }`，内容 `fn main() {}`
- **THEN** 渲染结果含 `<code class="language-rust">` 和 lowlight 注入的 token span

#### Scenario: 切换语言

- **WHEN** 用户在 NodeView 下拉中选择 `python`
- **THEN** 节点 attrs.language 更新为 `python`，DOM class 切换，高亮重新计算

#### Scenario: 复制按钮

- **WHEN** 用户点击 NodeView 复制按钮
- **THEN** 代码内容被写入剪贴板，按钮短暂显示「已复制」状态

---

### Requirement: 图片块（Image）

图片块 SHALL 支持上传适配器接入、alt 编辑、对齐和尺寸调整。

- 上传通过 `UploadHandler` 接口由消费方注入
- 包内提供默认实现 `createCloudinaryUploadHandler`，封装「调用 `/api/v1/upload/sign` 取签名 → 直传 Cloudinary」流程（与 `apps/main/src/components/AvatarUpload/index.tsx` 对齐）
- NodeView 含 alt/caption 输入框
- 支持左/中/右对齐（attrs.align）
- 支持拖拽 resize（attrs.width）
- 文件类型白名单：`image/jpeg` `image/png` `image/gif` `image/webp`
- 文件大小上限：10MB

```typescript
interface UploadHandler {
  upload(
    file: File | File[],
    opts?: { folder?: string; metadata?: Record<string, unknown> }
  ): Promise<UploadResult>;
}

interface UploadResult {
  url: string;       // 主 URL
  srcset?: string;   // 响应式 srcset（多尺寸时）
  lqip?: string;     // Low Quality Image Placeholder (base64)
  alt?: string;
}

interface CloudinaryUploadHandlerOptions {
  getSignatureUrl: string;                    // 默认 '/api/v1/upload/sign'
  getAuthToken: () => string | null;          // 读取 JWT
  defaultFolder?: string;                     // 默认 'article-images'
}

function createCloudinaryUploadHandler(opts: CloudinaryUploadHandlerOptions): UploadHandler;
```

> **注**：`UploadHandler` 接口预留 `File[]` 与 `srcset`/`lqip` 返回值，为未来 `self-hosted-image-pipeline` change 做 WebP 转码 + 多尺寸 + 水印 留口。本 change 内的实现只接受单个 `File` 原图直传，`srcset`/`lqip` 为 undefined。

#### Scenario: 上传 handler 缺失时降级

- **WHEN** 未注入 `uploadHandler` 且用户尝试上传图片
- **THEN** 编辑器阻止上传并提示「未配置上传服务」，不使用 base64（避免污染 Markdown）

#### Scenario: Cloudinary 默认流程

- **WHEN** 使用 `createCloudinaryUploadHandler({ getAuthToken: () => token })` 注入并上传图片
- **THEN** 依次触发 `POST /api/v1/upload/sign`（带 Authorization header）→ 用返回的签名直传 `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` → 返回 `secure_url` 作为 image 节点 src

#### Scenario: 拖拽图片到编辑器

- **WHEN** 用户拖拽图片文件到编辑器区域
- **THEN** 触发 `uploadHandler.upload(file, { folder: 'article-images/{articleId}' })`，成功后插入 image 节点

#### Scenario: 粘贴图片

- **WHEN** 用户从剪贴板粘贴图片（截图）
- **THEN** 编辑器读取剪贴板二进制数据，调用 `uploadHandler` 上传，再插入

#### Scenario: 文件校验

- **WHEN** 用户上传非白名单类型或超过 10MB 的文件
- **THEN** 编辑器拒绝上传并显示友好错误提示，不调用 uploadHandler

---

### Requirement: 容器块（Container）

容器块 SHALL 支持 4 种类型：tip / warning / info / danger，对应不同的视觉样式。

- attrs：`{ type: 'tip'|'warning'|'info'|'danger', title?: string }`
- 支持嵌套任意子块（段落、列表、代码块等）
- Markdown 表示：`:::tip [可选标题]\n内容\n:::`
- 与 `@luhanxin/md-parser-core` 的 `remark-container` 输出对齐（确保编辑器导出的 Markdown 能被只读渲染正确解析）

#### Scenario: 创建容器

- **WHEN** 用户通过 Slash 命令选择「警告容器」
- **THEN** 插入 `container(type: 'warning')` 节点，含一个空段落子节点，光标定位其中

#### Scenario: 容器嵌套子块

- **WHEN** 容器内输入 `## 子标题` + 段落 + 列表
- **THEN** 容器节点的 content 包含 heading + paragraph + bulletList，序列化为 Markdown 时正确包裹在 `:::warning ... :::` 中

#### Scenario: 与只读渲染对齐

- **WHEN** 编辑器导出的 Markdown 被传给 `<MarkdownRenderer>` (md-parser-react)
- **THEN** 渲染结果的容器结构与编辑器内呈现一致

---

### Requirement: Mermaid 块

Mermaid 块 SHALL 支持「编辑/预览」切换，预览渲染通过 dynamic import 加载 mermaid。

- attrs：`{ code: string, theme?: 'default' | 'dark' }`
- NodeView 默认显示预览，点击切换到编辑模式
- 编辑模式：textarea 显示源代码，blur 时切回预览
- Markdown 表示：` ```mermaid\n<code>\n``` `

#### Scenario: 渲染 mermaid 图表

- **WHEN** mermaid 节点 attrs.code 是合法的 Mermaid 语法
- **THEN** NodeView 异步加载 mermaid 库并渲染 SVG

#### Scenario: 渲染失败降级

- **WHEN** Mermaid 语法错误
- **THEN** NodeView 显示错误提示和原始代码，不阻塞编辑器其他部分

#### Scenario: dynamic import 不在主包

- **WHEN** 检查 dist 主 chunk
- **THEN** mermaid 不在主 chunk 中，仅在 mermaid 节点首次挂载时加载

---

### Requirement: 数学公式块

编辑器 SHALL 支持行内数学公式（`$...$`）和块级数学公式（`$$...$$`），渲染基于 KaTeX（dynamic import）。

- `inlineMath`：mark 或 inline node，attrs `{ formula: string }`
- `blockMath`：block node
- NodeView 含编辑/预览切换
- Markdown 表示与 `remark-math` 对齐

#### Scenario: 行内公式触发

- **WHEN** 用户输入 `$E = mc^2$`
- **THEN** 自动转换为 inlineMath 节点，渲染 KaTeX 输出

#### Scenario: 块级公式触发

- **WHEN** 用户在新行输入 `$$\n...\n$$`
- **THEN** 转换为 blockMath 节点

#### Scenario: KaTeX 不在主包

- **WHEN** 检查 dist 主 chunk
- **THEN** katex 不在主 chunk 中，仅在 math 节点首次挂载时加载

---

### Requirement: Slash 命令系统

编辑器 SHALL 提供 Slash 命令面板，输入 `/` 触发，支持搜索、键盘选择、分组显示。

- 触发字符：`/`
- 实现基础：`@tiptap/suggestion` + `tippy.js`
- 至少 15 个默认命令（H1/H2/H3、引用、分隔线、ul/ol/任务列表、图片、代码块、表格、数学公式、Mermaid、容器 ×4）
- 命令分组：basic / media / advanced
- 支持中英文 keyword 搜索

```typescript
interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  keywords: string[];
  group: 'basic' | 'media' | 'advanced';
  command: (props: { editor: Editor; range: Range }) => void;
}
```

#### Scenario: 触发面板

- **WHEN** 用户在空段落或行末输入 `/`
- **THEN** 弹出 Slash 命令面板，光标周围定位

#### Scenario: 搜索过滤

- **WHEN** 用户输入 `/code`
- **THEN** 命令列表仅显示 title/keywords 含「code」的命令（如「代码块」keywords: ['code', '代码', '```']）

#### Scenario: 键盘选择

- **WHEN** 用户按上下方向键
- **THEN** 高亮项切换；按回车执行高亮命令；按 Esc 关闭面板

#### Scenario: 命令执行

- **WHEN** 选中「H2」命令
- **THEN** 当前段落转换为 heading(level=2)，光标保留在同位置

#### Scenario: 消费方追加命令

- **WHEN** `<DocEditor extraSlashCommands={[customCmd]}>` 传入自定义命令
- **THEN** 面板列表包含默认命令 + 自定义命令

---

### Requirement: Bubble Menu（选区浮层）

选中文本时 SHALL 显示浮层菜单，提供常用 inline 格式按钮。

- 按钮：粗体、斜体、删除线、行内代码、链接、清除格式
- 链接按钮点击弹出 URL 输入框
- 仅在文本选区（非空且非整个块）时显示

#### Scenario: 选中文本显示菜单

- **WHEN** 用户用鼠标或键盘选中段落内的部分文字
- **THEN** Bubble Menu 出现在选区上方

#### Scenario: 切换格式

- **WHEN** 选中后点击「粗体」按钮
- **THEN** 选中文字应用 `strong` mark，再次点击移除

---

### Requirement: Floating Menu（空行浮层）

空段落行首 SHALL 显示「+」按钮，点击打开 Slash 面板。

#### Scenario: 空行显示加号

- **WHEN** 光标位于空段落
- **THEN** 行首显示 "+" 按钮（左侧 padding 区域）

#### Scenario: 点击加号打开 Slash 面板

- **WHEN** 用户点击「+」按钮
- **THEN** 弹出 Slash 命令面板

---

### Requirement: 块级操作（拖拽 + 菜单）

每个块 SHALL 支持悬停显示拖拽手柄和操作菜单。

- 行首悬停区显示「⋮⋮」拖拽手柄 + 「⋯」操作按钮
- 拖拽手柄支持上下拖动重排块
- 操作按钮菜单项：删除块、复制块、上移、下移、转换为 ...

#### Scenario: 显示拖拽手柄

- **WHEN** 鼠标悬停在某个块上
- **THEN** 块左侧 padding 区域出现「⋮⋮」手柄

#### Scenario: 拖拽重排

- **WHEN** 用户拖动手柄到另一位置
- **THEN** 块在目标位置插入，原位置移除，编辑器内容更新

#### Scenario: 删除块

- **WHEN** 用户点击「⋯」→「删除」
- **THEN** 当前块被移除，光标移到前一个块末尾
