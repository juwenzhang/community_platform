# @luhanxin/doc-editor

> TipTap-based block editor for Luhanxin community platform — block editing, Slash commands, IndexedDB autosave, draft recovery, and offline-friendly.

[中文文档](./README.zh-CN.md) · English

---

## Features

- ✅ **Block-based WYSIWYG** — Built on ProseMirror + TipTap
- ✅ **Rich Blocks** — CodeBlock (lowlight), Table, TaskList, Image, Container (tip/warning/info/danger), Mermaid, KaTeX Math
- ✅ **Slash Commands** — Type `/` to insert any block, with React + tippy.js rendering
- ✅ **Bubble / Floating / Block menus** — Selection toolbar, empty-line toolbar, hover block handle
- ✅ **Smart Paste** — URL → link, Markdown detection, Ctrl+Shift+V plain text
- ✅ **Image Paste & Drop** — Ctrl+V screenshot or drag files → auto-upload via injected handler
- ✅ **IndexedDB Autosave** — Debounced local save (800ms) + periodic remote sync (30s)
- ✅ **Draft Recovery** — On mount, prompts user if local draft is newer than server
- ✅ **Offline Support** — Detects offline, skips remote save, resumes on reconnect
- ✅ **Markdown ↔ JSON** — Lossless round-trip conversion (37 test cases)
- ✅ **Word Count / Reading Time** — Built-in stats with CJK + English support

---

## Architecture Overview

The editor is composed of **3 independent layers**. Each layer has a single responsibility and does not leak into others:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   User types on keyboard → TipTap editor state updates (PM JSON)    │
│                                     │                               │
│                                     ▼                               │
│                       editor.on('update', ...)                      │
│                                     │                               │
│               ┌─────────────────────┴─────────────────────┐         │
│               │                                           │         │
│               ▼                                           ▼         │
│       Consumer's onUpdate                          useAutosave      │
│        (UI display)                                (persistence)    │
│               │                                           │         │
│               ▼                                           ▼         │
│       jsonToMarkdown(json)                   debounce 800ms         │
│          (pure function)                                  │         │
│               │                                           ▼         │
│               ▼                                    readSnapshot()   │
│       setMarkdown(md)                        (json + jsonToMarkdown)│
│       (React state → preview)                             │         │
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
│                                                  │ (idb lib)  │     │
│                                                  └────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Separation of Concerns

| Module | Role | What it does | What it doesn't |
|--------|------|--------------|-----------------|
| `convert/` | **Translator** | Markdown ↔ ProseMirror JSON pure functions | No I/O, no storage |
| `autosave/DraftStore.ts` | **Storage clerk** | IndexedDB CRUD via `idb` | Doesn't know about editor |
| `autosave/useAutosave.ts` | **Broker** | Subscribes to `editor.on('update')`, debounces, orchestrates local + remote save | Doesn't own data |
| `interactions/*` | **Behavior enhancers** | Paste, drop, shortcuts, word count | Isolated ProseMirror plugins |
| `blocks/*` | **Block extensions** | Each block is a standalone TipTap extension | No cross-block deps |
| `menu/*` | **UI toolbars** | Bubble, Floating, BlockHandle React components | Pure UI, no business logic |

---

## Where is my data actually stored?

The **only two lines** that touch storage are in `autosave/DraftStore.ts`:

```typescript
// Line 51 — Open/create the IndexedDB database
dbPromise = openDB(DB_NAME, DB_VERSION, { upgrade(db) { /* ... */ } });

// Line 74 — Write a draft record (the actual "save" action)
await db.put(STORE_NAME, record);
```

Everything else — the debouncer, the status machine, the snapshot extraction — lives in `useAutosave.ts` and funnels into these two calls.

> 💡 **To inspect stored data**: Open DevTools → Application → IndexedDB → `luhanxin-doc-editor` → `drafts`.

Data is persisted in the browser's built-in IndexedDB engine (backed by LevelDB on Chromium, SQLite on Firefox/Safari). It survives page refresh, browser restart, and disk-level crashes. It is **not** stored in any file you can find in the project tree.

---

## Installation

```bash
pnpm add @luhanxin/doc-editor
# Peer deps (already included in the workspace):
# react, react-dom, @tiptap/react
```

---

## Quick Start

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

## API Reference

### Core

- `createEditor(options)` — Async editor factory (accepts Markdown string or PM JSON)
- `getDefaultExtensions(options)` — Returns default extension array

### Conversion

- `markdownToJson(markdown: string): Promise<ProseMirrorJSON>` — Parse Markdown to PM JSON
- `jsonToMarkdown(json: ProseMirrorJSON): string` — Serialize PM JSON to Markdown

### Autosave

- `useAutosave(options)` — Autosave hook with status machine
- `useDraftRestore(options)` — Draft restoration check
- `saveDraft / loadDraft / deleteDraft / cleanupOld` — Low-level draft CRUD
- `<SaveStatusIndicator />` — Status display component
- `<DraftRestorePrompt />` — Recovery dialog

### Blocks

`CodeBlock / Image / Container / Mermaid / InlineMath / BlockMath / TableExtensions / TaskListExtensions`

### Interactions

`ImageUpload / SmartPaste / ExtraKeybindings / WordCount`

### Menus

`<BubbleMenu /> / <FloatingMenu /> / <BlockHandle />`

See `src/index.ts` for the complete export list.

---

## Design Decisions

### Why TipTap (vs Slate / Lexical / raw ProseMirror)?
- Mature ecosystem, plug-and-play extensions
- React-friendly, but core is framework-agnostic
- Battle-tested schema design

### Why Markdown as data exchange format?
- Backend stays simple (stores Markdown as-is, no schema change)
- Forward compatible with existing content
- PM JSON only lives in memory and IndexedDB (never touches the wire)

### Why dual-format storage (JSON + Markdown) in drafts?
- **JSON** for fast editor restore (no parsing needed)
- **Markdown** for remote sync (matches backend contract)

### Why debounce 800ms for local save?
- Balance between responsiveness and write frequency
- Typical fast typist produces ~5 keystrokes per 800ms → 1 IDB write
- Remote sync handled separately at 30s interval

---

## Testing

```bash
pnpm test         # Run all tests (56 tests)
pnpm typecheck    # TypeScript type check
pnpm build        # Production bundle (41 KB minified)
```

---

## License

MIT © luhanxin
