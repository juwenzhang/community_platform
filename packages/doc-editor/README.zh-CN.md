# @luhanxin/doc-editor

> 基于 TipTap 的块编辑器 — 为 Luhanxin 社区平台提供文档编辑能力，包含块系统、Slash 命令、IndexedDB 自动保存、草稿恢复、离线支持。

中文 · [English](./README.md)

---

## 特性

- ✅ **块级所见即所得编辑器** — 基于 ProseMirror + TipTap 构建
- ✅ **丰富的块类型** — CodeBlock (lowlight) / Table / TaskList / Image / Container (tip/warning/info/danger) / Mermaid / KaTeX 数学公式
- ✅ **Slash 命令** — 输入 `/` 触发命令面板，React + tippy.js 渲染
- ✅ **Bubble / Floating / Block 菜单** — 选区工具条、空段落插入条、块 hover 手柄
- ✅ **智能粘贴** — URL 自动转链接、Markdown 识别、Ctrl+Shift+V 纯文本
- ✅ **图片粘贴 / 拖拽** — Ctrl+V 截图或从文件管理器拖入 → 自动走注入的上传 handler
- ✅ **IndexedDB 自动保存** — 本地防抖 800ms + 远程定时同步 30s
- ✅ **草稿恢复** — 挂载时检测本地是否有比服务端更新的草稿并弹窗询问
- ✅ **离线支持** — 检测到离线跳过远程保存，联网后自动恢复同步
- ✅ **Markdown ↔ JSON 无损转换** — 37 个 round-trip 测试覆盖
- ✅ **字数 / 阅读时间统计** — 中英混排计数，挂在 `editor.storage.wordCount`

---

## 架构概览

编辑器由 **3 个独立分层** 组成，各司其职，互不耦合：

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   用户敲键盘 → TipTap editor 内部状态变化（PM JSON）                  │
│                                     │                               │
│                                     ▼                               │
│                       editor.on('update', ...)                      │
│                                     │                               │
│               ┌─────────────────────┴─────────────────────┐         │
│               │                                           │         │
│               ▼                                           ▼         │
│       调用方的 onUpdate                             useAutosave     │
│        （UI 显示）                                  （持久化）        │
│               │                                           │         │
│               ▼                                           ▼         │
│       jsonToMarkdown(json)                        防抖 800ms         │
│          （纯函数）                                        │         │
│               │                                           ▼         │
│               ▼                                    readSnapshot()   │
│       setMarkdown(md)                        (json + jsonToMarkdown)│
│       （React state → 预览面板）                          │         │
│                                                           ▼         │
│                                               saveDraft({           │
│                                                 id, articleId,      │
│                                                 contentJson,        │
│                                                 contentMarkdown,    │
│                                               })                    │
│                                                           │         │
│                                                           ▼         │
│                                                  ┌────────────┐     │
│                                                  │ IndexedDB  │     │
│                                                  │ (idb 库)   │     │
│                                                  └────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 关注点分离

| 模块 | 角色 | 负责什么 | 不负责什么 |
|------|------|---------|-----------|
| `convert/` | **翻译官** | Markdown ↔ ProseMirror JSON 纯函数转换 | 不做 I/O、不做存储 |
| `autosave/DraftStore.ts` | **仓库管理员** | 通过 `idb` 库做 IndexedDB CRUD | 不认识 editor |
| `autosave/useAutosave.ts` | **中间人** | 订阅 `editor.on('update')`、防抖、编排本地+远程保存 | 不持有数据本身 |
| `interactions/*` | **行为增强** | 粘贴、拖拽、快捷键、字数统计 | 独立 ProseMirror 插件 |
| `blocks/*` | **块扩展** | 每个块是独立 TipTap Extension | 块之间无依赖 |
| `menu/*` | **UI 工具条** | Bubble、Floating、BlockHandle 组件 | 纯 UI，无业务逻辑 |

---

## 我的数据到底存在哪里？

真正触碰存储的 **只有两行代码**，都在 `autosave/DraftStore.ts`：

```typescript
// 第 51 行 — 打开 / 创建 IndexedDB 数据库
dbPromise = openDB(DB_NAME, DB_VERSION, { upgrade(db) { /* ... */ } });

// 第 74 行 — 写入草稿记录（真正的"保存"动作）
await db.put(STORE_NAME, record);
```

其它代码（防抖器、状态机、snapshot 抽取）都在 `useAutosave.ts`，最终都汇聚到这两行调用。

> 💡 **查看实际存储内容**：打开 DevTools → Application（应用）→ IndexedDB → `luhanxin-doc-editor` → `drafts`。

数据存在浏览器内置的 IndexedDB 引擎中（Chromium 底层用 LevelDB，Firefox/Safari 用 SQLite）。它在页面刷新、浏览器重启、甚至磁盘级崩溃后依然存在。**数据不在项目目录的任何文件里**。

---

## 安装

```bash
pnpm add @luhanxin/doc-editor
# peer deps（workspace 中已安装）：
# react, react-dom, @tiptap/react
```

---

## 快速上手

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import {
  getDefaultExtensions,
  jsonToMarkdown,
  markdownToJson,
  BubbleMenu,
  FloatingMenu,
  BlockHandle,
  SlashCommand,
  createReactSlashRenderer,
  defaultSlashCommands,
  useAutosave,
  useDraftRestore,
  DraftRestorePrompt,
  SaveStatusIndicator,
  createCloudinaryUploadHandler,
} from '@luhanxin/doc-editor';

function ArticleEditor({ articleId, serverUpdatedAt }) {
  const uploadHandler = createCloudinaryUploadHandler({
    getAuthToken: () => localStorage.getItem('luhanxin_auth_token'),
    defaultFolder: `article-images/${articleId}`,
  });

  const editor = useEditor({
    extensions: [
      ...getDefaultExtensions({
        imageUpload: { uploadHandler },
        smartPaste: { markdownToJson },
      }),
      SlashCommand.configure({
        items: defaultSlashCommands,
        render: createReactSlashRenderer(),
      }),
    ],
  });

  const autosave = useAutosave({
    editor,
    draftId: articleId,
    articleId,
    onRemoteSave: async (markdown) => {
      await api.updateArticle({ articleId, content: markdown });
    },
  });

  const { pendingDraft, restore, discard } = useDraftRestore({
    editor,
    draftId: articleId,
    serverUpdatedAt,
  });

  return (
    <>
      <SaveStatusIndicator {...autosave} />
      <EditorContent editor={editor} />
      {editor && (
        <>
          <BubbleMenu editor={editor} />
          <FloatingMenu editor={editor} />
          <BlockHandle editor={editor} />
        </>
      )}
      <DraftRestorePrompt draft={pendingDraft} onRestore={restore} onDiscard={discard} />
    </>
  );
}
```

---

## API 速查

### 核心

- `createEditor(options)` — 异步编辑器工厂（支持 Markdown 字符串或 PM JSON 输入）
- `getDefaultExtensions(options)` — 返回默认扩展数组

### 格式转换

- `markdownToJson(markdown: string): Promise<ProseMirrorJSON>` — Markdown → PM JSON
- `jsonToMarkdown(json: ProseMirrorJSON): string` — PM JSON → Markdown

### 自动保存

- `useAutosave(options)` — 自动保存 Hook（带状态机）
- `useDraftRestore(options)` — 草稿恢复检查
- `saveDraft / loadDraft / deleteDraft / cleanupOld` — 底层草稿 CRUD
- `<SaveStatusIndicator />` — 状态显示组件
- `<DraftRestorePrompt />` — 恢复弹窗

### 块扩展

`CodeBlock / Image / Container / Mermaid / InlineMath / BlockMath / TableExtensions / TaskListExtensions`

### 交互增强

`ImageUpload / SmartPaste / ExtraKeybindings / WordCount`

### 菜单组件

`<BubbleMenu /> / <FloatingMenu /> / <BlockHandle />`

完整导出见 `src/index.ts`。

---

## 设计决策

### 为什么选 TipTap（vs Slate / Lexical / 原生 ProseMirror）？
- 生态成熟，大量开箱即用的扩展
- React 友好，核心仍保持框架无关
- Schema 设计经过生产验证

### 为什么用 Markdown 作为数据交换格式？
- 后端保持简单（直接存 Markdown，无 schema 变更）
- 对存量内容向前兼容
- PM JSON 仅存在于内存和 IndexedDB，永不触达网络

### 为什么草稿里同时存 JSON 和 Markdown？
- **JSON** 用于快速编辑器恢复（无需重新解析 Markdown）
- **Markdown** 用于远程同步（匹配后端契约）
- 两种格式各取所长，权衡空间换性能

### 为什么本地防抖用 800ms？
- 在响应性和写入频率之间平衡
- 典型快速打字 800ms 大约敲 5 次键盘 → 每次防抖只有 1 次 IDB 写入
- 远程同步走独立的 30s 定时通道

---

## 测试

```bash
pnpm test         # 跑全部测试（共 56 个）
pnpm typecheck    # TypeScript 类型检查
pnpm build        # 生产构建（minified 41 KB）
```

---

## License

MIT © luhanxin
