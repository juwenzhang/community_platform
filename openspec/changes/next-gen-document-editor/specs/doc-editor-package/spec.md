## ADDED Requirements

### Requirement: 包基础配置

`@luhanxin/doc-editor` SHALL 是一个基于 TipTap v2 的 React 块编辑器包，作为 Luhanxin 平台所有文档编辑场景的统一入口。

- 包名：`@luhanxin/doc-editor`
- 版本：0.1.0（pre-release，允许破坏性变更）
- 类型：ES Module（`"type": "module"`）
- 构建工具：tsup
- peerDependencies：`react ^18.0.0`、`react-dom ^18.0.0`
- 必需 dependencies：`@tiptap/core`、`@tiptap/pm`、`@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/suggestion`、`tippy.js`、`idb`、`lowlight`、`@luhanxin/md-parser-core: workspace:*`

#### Scenario: 包可被 apps/main 引用

- **WHEN** `apps/main/package.json` 声明 `"@luhanxin/doc-editor": "workspace:*"` 后执行 `pnpm install`
- **THEN** 编辑页可正常 `import { DocEditor } from '@luhanxin/doc-editor'`，类型提示完整

#### Scenario: 包独立可构建

- **WHEN** 在 `packages/doc-editor` 目录执行 `pnpm build`
- **THEN** 输出 `dist/index.js` + `dist/index.d.ts`，构建无报错

---

### Requirement: Editor 工厂

包 SHALL 暴露 `createEditor(options)` 工厂函数，封装 TipTap Editor 实例的创建过程，统一默认扩展集合、占位符、键盘映射等配置。

```typescript
interface CreateEditorOptions {
  content?: string | object;          // 初始内容（Markdown 字符串或 PM JSON）
  placeholder?: string;
  editable?: boolean;                 // 默认 true
  extensions?: AnyExtension[];        // 追加扩展（合并到默认集合）
  onUpdate?: (editor: Editor) => void;
  onCreate?: (editor: Editor) => void;
}

export function createEditor(options: CreateEditorOptions): Editor;
```

#### Scenario: 创建实例并销毁

- **WHEN** 调用 `const editor = createEditor({ content: '# Hello' })`，再调用 `editor.destroy()`
- **THEN** Editor 创建成功且销毁后无内存泄漏（DOM 节点和事件监听全部清理）

#### Scenario: 字符串内容自动识别为 Markdown

- **WHEN** 调用 `createEditor({ content: '# Hello\n\nworld' })`
- **THEN** 内容自动经过 `markdownToJson` 转换为 PM JSON 后注入编辑器

#### Scenario: 扩展可追加

- **WHEN** 调用 `createEditor({ extensions: [customExtension] })`
- **THEN** 编辑器同时拥有默认扩展和 `customExtension`

---

### Requirement: 默认扩展集合

包 SHALL 维护默认扩展集合，至少包含：

- `@tiptap/starter-kit`（含段落/标题/列表/引用/粗体/斜体/代码/历史等基础节点）
- `@tiptap/extension-link`
- `@tiptap/extension-image`（增强版，含上传适配器）
- `@tiptap/extension-table` + `table-row` + `table-cell` + `table-header`
- `@tiptap/extension-task-list` + `task-item`
- `@tiptap/extension-code-block-lowlight`（替换 starter-kit 自带 code-block）
- `@tiptap/extension-bubble-menu`、`@tiptap/extension-floating-menu`
- 自定义扩展：`SlashCommand`、`Container`、`Mermaid`、`InlineMath`、`BlockMath`

#### Scenario: 默认编辑器支持全部基础块

- **WHEN** 用 `createEditor({})` 创建编辑器（不传 extensions）
- **THEN** 用户可输入并正确渲染段落、H1-H6、列表、引用、代码块、表格、任务列表、链接、图片、容器、Mermaid、数学公式

---

### Requirement: Markdown ↔ PM JSON 双向转换

包 SHALL 提供 `markdownToJson()` 和 `jsonToMarkdown()` 双向转换函数，作为编辑器与外部 Markdown 字符串交互的唯一通道。

```typescript
export function markdownToJson(markdown: string): ProseMirrorJSON;
export function jsonToMarkdown(json: ProseMirrorJSON): string;
```

转换器的解析层 SHALL 复用 `@luhanxin/md-parser-core` 的 `parseMarkdownToAst` 拿到 mdast，避免与只读渲染管线产生 AST 不一致。

#### Scenario: 基础 Markdown 转换为 PM JSON

- **WHEN** 调用 `markdownToJson('# Title\n\nHello **world**')`
- **THEN** 返回的 PM JSON 含 `heading(level=1)` + `paragraph`（含 `text` 和 `strong` 标记）

#### Scenario: PM JSON 序列化为 Markdown

- **WHEN** 调用 `jsonToMarkdown(json)`，json 含 heading + paragraph + bullet list
- **THEN** 返回的 Markdown 字符串可被 `markdownToJson` 再次解析为等价的 PM JSON

#### Scenario: round-trip 等价性（基础节点）

- **WHEN** 对包含「标题/段落/无序列表/有序列表/引用/代码块/链接/粗体/斜体/分隔线」的 Markdown 调用 `jsonToMarkdown(markdownToJson(md))`
- **THEN** 输出经过空白规范化后与输入字符串等价

#### Scenario: 不支持节点的降级处理

- **WHEN** Markdown 中包含编辑器不识别的扩展节点（如某种 HTML 内嵌）
- **THEN** 转换器保留节点文本表示并通过 console.warn 输出警告，不抛错

---

### Requirement: React 集成层

包 SHALL 提供 `<DocEditor>` 主组件作为 React 应用的接入入口。

Props：

```typescript
interface DocEditorProps {
  initialContent?: string;            // 初始 Markdown 字符串
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (markdown: string) => void;       // 内容变化回调（已序列化为 Markdown）
  onSave?: (markdown: string) => Promise<void>; // 远程保存回调（autosave 调用）
  uploadHandler?: UploadHandler;       // 图片上传适配器
  extraSlashCommands?: SlashCommand[]; // 追加 Slash 命令
  autosave?: AutosaveOptions | false;  // 自动保存配置（false 关闭）
  className?: string;
}
```

#### Scenario: 基础挂载

- **WHEN** `<DocEditor initialContent="# Hello" />`
- **THEN** 编辑器正确渲染含 H1 节点的内容，可继续输入

#### Scenario: 内容变化回调

- **WHEN** 用户输入字符
- **THEN** `onChange(markdown)` 被调用，参数为序列化后的 Markdown 字符串

#### Scenario: 只读模式

- **WHEN** `<DocEditor readOnly initialContent="..." />`
- **THEN** 编辑器以只读形式渲染，不响应输入事件，不显示工具栏

#### Scenario: 卸载清理

- **WHEN** 组件 unmount
- **THEN** Editor 实例被 destroy，IndexedDB 防抖定时器被清理，事件监听被移除

---

### Requirement: useDocEditor Hook 与 Provider

包 SHALL 提供 `useDocEditor()` Hook 暴露 Editor 实例，以及 `<DocEditorProvider>` 提供全局配置（如默认上传 handler）。

#### Scenario: Hook 返回 Editor 实例

- **WHEN** 在 `<DocEditor>` 内部子组件调用 `useDocEditor()`
- **THEN** 返回当前 Editor 实例，可调用 TipTap 命令（如 `editor.chain().focus().toggleBold().run()`）

#### Scenario: Provider 注入上传 handler

- **WHEN** 顶层包裹 `<DocEditorProvider value={{ uploadHandler: myUpload }}>`
- **THEN** 内部所有 `<DocEditor>` 实例如未指定 uploadHandler prop 则使用 Provider 注入的值

---

### Requirement: 公共 API 导出

包 SHALL 通过 `index.ts` 导出以下公共 API，供消费方使用。其他实现细节 SHALL NOT 通过 deep import 暴露。

必须导出的内容：
- 组件：`DocEditor`、`DocEditorProvider`、`SaveStatusIndicator`、`DraftRestorePrompt`
- Hook：`useDocEditor`、`useAutosave`
- 工厂：`createEditor`
- 转换器：`markdownToJson`、`jsonToMarkdown`
- 草稿存储：`DraftStore`（类）
- 类型：`DocEditorProps`、`SlashCommand`、`UploadHandler`、`AutosaveOptions`、`SaveStatus`、`Draft`

#### Scenario: 公共 API 可正常导入

- **WHEN** `import { DocEditor, useAutosave, type SlashCommand } from '@luhanxin/doc-editor'`
- **THEN** 全部导入成功，类型提示完整

#### Scenario: 内部模块不可被 deep import

- **WHEN** 尝试 `import x from '@luhanxin/doc-editor/src/blocks/code-block/CodeBlockView'`
- **THEN** 因 `package.json` `exports` 字段限制而失败

---

### Requirement: 包体积约束

`@luhanxin/doc-editor` 主包（不含 lazy import 的 mermaid/katex）SHALL 控制 gzip 后体积不超过 280KB。

mermaid 与 katex 在对应块首次渲染时通过 dynamic import 加载，不计入主包体积。

#### Scenario: 主包体积达标

- **WHEN** 执行 `pnpm build` 后用 size-limit 或类似工具检测 dist
- **THEN** gzip 后总大小 ≤ 280KB

#### Scenario: mermaid 不在主包

- **WHEN** 用打包分析工具检查 dist
- **THEN** mermaid 模块不在 main chunk 中，仅出现在动态 chunk
