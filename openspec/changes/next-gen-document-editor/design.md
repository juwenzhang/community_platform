## Context

当前编辑器是 `apps/main/src/components/ArticleEditor/index.tsx`，使用 textarea + react-markdown 简单实现。需要升级为类飞书/语雀的块编辑器。

**技术选型考虑**：ProseMirror（底层） vs TipTap（ProseMirror 封装） vs Slate.js（React 原生）。

**范围说明**：本次仅实现 editor-core（块编辑器 + 渲染优化 + 自动保存），协同编辑和创作空间在独立 change 中实现。

## Goals / Non-Goals

**Goals:**

1. TipTap 块编辑器 — 段落/标题/代码/图片/引用/表格/数学公式/Mermaid
2. Slash 命令面板
3. Markdown 快捷键
4. Markdown 双向转换（编辑器 ↔ Markdown）
5. 渲染性能迭代路径设计（DOM → 虚拟列表 → Canvas → WebGL）
6. 自动保存与数据丢失防护

**Non-Goals:**

- 协同编辑（editor-collab change）
- 用户创作空间（editor-workspace change）
- 全文协同编辑/评论批注/AI 写作助手/移动端适配
- Canvas/WebGL 实现（仅设计接口）

## Decisions

### Decision 1: 编辑器框架 — TipTap

| 方案 | 优势 | 劣势 |
|------|------|------|
| **TipTap** | ProseMirror 封装、插件丰富、React 集成好、Yjs 适配器成熟 | 包体积较大（~500KB gzip） |
| Slate.js | React 原生、轻量 | 生态弱、协同编辑需要自建 |
| ProseMirror | 灵活、底层 | API 复杂、React 集成需自建 |

**选择 TipTap**：生态最丰富，Yjs 协同编辑适配器成熟，为后续协同编辑预留基础。

### Decision 2: 编辑器存储格式

**JSON 块数据格式**：

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "标题" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "正文..." }] },
    { "type": "codeBlock", "attrs": { "language": "rust" }, "content": [{ "type": "text", "text": "fn main() {}" }] },
    { "type": "image", "attrs": { "src": "https://...", "alt": "图片" } },
    { "type": "table", "content": [ /* ... */ ] }
  ],
  "version": 1
}
```

**向后兼容策略**：

| 存储字段 | 类型 | 说明 |
|----------|------|------|
| `content_markdown` | TEXT | 原始 Markdown 文本（保留） |
| `content_json` | JSONB | 块编辑器 JSON 数据（新增） |

**Markdown 双向转换**：

```typescript
// packages/editor/src/converters/markdown.ts
import { generateJSON } from '@tiptap/html';
import { marked } from 'marked';

// Markdown → JSON
export function markdownToJSON(markdown: string): ProseMirrorJSON {
  const html = marked(markdown);
  return generateJSON(html, extensions);
}

// JSON → Markdown
export function jsonToMarkdown(json: ProseMirrorJSON): string {
  // 遍历 JSON 树，生成 Markdown
  return serializeNode(json);
}
```

### Decision 3: 渲染性能迭代路径

**只读模式渲染优化**：

```
┌─────────────────────────────────────────────────────────────┐
│                 文章详情页渲染架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Phase 1: DOM 渲染 ─────────────────────────────────┐   │
│  │  适用: < 5000 字                                     │   │
│  │  技术: TipTap + @luhanxin/md-parser-react           │   │
│  │  性能: 基准                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Phase 2: DOM + 虚拟列表 ──────────────────────────┐   │
│  │  适用: 5000-20000 字                                │   │
│  │  技术: react-window + 块虚拟化                      │   │
│  │  性能: FPS > 55                                     │   │
│  │  优化: 仅渲染可视区域块                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Phase 3: Canvas 渲染（未来）──────────────────────┐   │
│  │  适用: 20000-100000 字                              │   │
│  │  技术: Canvas 2D + 块渲染器                         │   │
│  │  性能: FPS > 50                                     │   │
│  │  优化: 避免大量 DOM 节点                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Phase 4: WebGL/WebGPU（未来）─────────────────────┐   │
│  │  适用: > 100000 字                                  │   │
│  │  技术: WebGL/WebGPU + GPU 加速                      │   │
│  │  性能: FPS > 45                                     │   │
│  │  优化: 极致性能场景                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**渲染策略选择器**：

```typescript
// packages/editor/src/renderer/strategy.ts
export function selectRenderStrategy(wordCount: number): RenderStrategy {
  if (wordCount < 5000) {
    return { type: 'dom', virtualization: false };
  } else if (wordCount < 20000) {
    return { type: 'dom', virtualization: true };
  } else if (wordCount < 100000) {
    return { type: 'canvas', fallback: 'dom-virtualized' }; // 未来实现
  } else {
    return { type: 'webgl', fallback: 'canvas' }; // 未来实现
  }
}
```

**虚拟列表实现（Phase 2）**：

```tsx
// packages/editor/src/renderer/VirtualizedRenderer.tsx
import { FixedSizeList } from 'react-window';

export function VirtualizedRenderer({ blocks }: { blocks: Block[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <BlockRenderer block={blocks[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={800}
      itemCount={blocks.length}
      itemSize={100} // 平均块高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Decision 4: 自动保存与数据丢失防护

**自动保存策略**：

```
┌─────────────────────────────────────────────────────────────┐
│                   自动保存流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户编辑 → 内容变化                                         │
│     ↓                                                       │
│  防抖 500ms                                                 │
│     ↓                                                       │
│  保存到 IndexedDB（本地）                                    │
│     ↓                                                       │
│  定时 30s                                                   │
│     ↓                                                       │
│  同步到后端（远程）                                          │
│     ↓                                                       │
│  生成版本快照（保留最近 10 个）                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**IndexedDB 缓存设计**：

```typescript
// packages/editor/src/autosave/indexeddb.ts
interface DraftDocument {
  id: string;
  articleId?: string;
  content: ProseMirrorJSON;
  markdown: string;
  updatedAt: number;
  version: number;
}

const DB_NAME = 'luhanxin-editor';
const STORE_NAME = 'drafts';

export async function saveDraft(doc: DraftDocument) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    },
  });
  
  await db.put(STORE_NAME, doc);
}

export async function loadDraft(id: string): Promise<DraftDocument | null> {
  const db = await openDB(DB_NAME, 1);
  return db.get(STORE_NAME, id);
}

export async function listDrafts(): Promise<DraftDocument[]> {
  const db = await openDB(DB_NAME, 1);
  return db.getAll(STORE_NAME);
}
```

**冲突恢复**：

```typescript
// packages/editor/src/autosave/conflict.ts
export async function detectConflict(
  localVersion: number,
  remoteVersion: number
): Promise<ConflictState> {
  if (localVersion === remoteVersion) {
    return { type: 'none' };
  }
  
  return {
    type: 'conflict',
    localVersion,
    remoteVersion,
    resolution: 'prompt', // 提示用户选择
  };
}

export function resolveConflict(
  strategy: 'keep-local' | 'keep-remote' | 'merge'
): void {
  // 实现冲突解决逻辑
}
```

**版本快照**：

```sql
-- PostgreSQL 表设计
CREATE TABLE article_draft_versions (
  id UUID PRIMARY KEY,
  article_id UUID NOT NULL,
  version INT NOT NULL,
  content_json JSONB NOT NULL,
  content_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- 只保留最近 10 个版本
  CONSTRAINT max_versions CHECK (version >= 0)
);

-- 自动清理旧版本
CREATE INDEX idx_draft_versions ON article_draft_versions (article_id, version DESC);
```

### Decision 5: 包结构设计

```
packages/editor/
├── src/
│   ├── index.ts               # 导出所有公共 API
│   ├── core/
│   │   ├── Editor.tsx         # TipTap 编辑器封装
│   │   ├── extensions.ts      # TipTap 扩展注册
│   │   └── schema.ts          # ProseMirror schema 定义
│   ├── extensions/
│   │   ├── code-block/        # 代码块扩展
│   │   ├── image/             # 图片扩展
│   │   ├── table/             # 表格扩展
│   │   ├── math/              # 数学公式扩展
│   │   └── mermaid/           # Mermaid 图表扩展
│   ├── slash-command/
│   │   ├── CommandPalette.tsx # Slash 命令面板
│   │   └── commands.ts        # 命令定义
│   ├── toolbar/
│   │   ├── BubbleMenu.tsx     # 浮动菜单
│   │   ├── BlockMenu.tsx      # 块菜单
│   │   └── BottomToolbar.tsx  # 底部工具栏
│   ├── renderer/
│   │   ├── DOMRenderer.tsx    # Phase 1: DOM 渲染
│   │   ├── VirtualizedRenderer.tsx # Phase 2: 虚拟列表
│   │   ├── CanvasRenderer.tsx # Phase 3: Canvas（空实现）
│   │   ├── WebGLRenderer.tsx  # Phase 4: WebGL（空实现）
│   │   └── strategy.ts        # 渲染策略选择器
│   ├── converters/
│   │   ├── markdown.ts        # Markdown ↔ JSON 转换
│   │   └── html.ts            # HTML ↔ JSON 转换
│   ├── autosave/
│   │   ├── index.ts           # 自动保存主逻辑
│   │   ├── indexeddb.ts       # IndexedDB 存储
│   │   ├── sync.ts            # 远程同步
│   │   └── conflict.ts        # 冲突检测与解决
│   └── types/
│       ├── block.ts           # 块类型定义
│       └── editor.ts          # 编辑器配置类型
├── package.json
└── tsconfig.json
```

### Decision 6: Open Questions 解决

| 问题 | 决策 | 理由 |
|------|------|------|
| **是否需要独立的 apps/editor 子应用？** | **否，作为 packages/editor** | 编辑器是共享组件，被 article/search/admin 等多个 app 引用，不应该独立为 app |
| **协同编辑服务是独立微服务还是集成到 Gateway？** | **独立 svc-collab（后续 change）** | WebSocket 长连接服务与 HTTP Gateway 关注点不同，独立服务便于扩展和维护 |
| **版本历史的 diff 格式选择？** | **JSON Patch** | JSON Patch（RFC 6902）是标准格式，工具库丰富，易于调试 |
| **文章模板系统是否在本次实现？** | **否，在 editor-workspace change** | 模板系统依赖创作空间，本次仅实现核心编辑器 |
| **是否需要 Markdown 双向同步？** | **是，必须实现** | 向后兼容现有 Markdown 文章，支持导出为 Markdown |

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| TipTap 包体积 | ~500KB gzip | 按需加载扩展 + Code Splitting |
| Markdown 双向转换准确性 | 复杂格式可能丢失 | 明确支持的 Markdown 子集 + 转换警告 |
| 虚拟列表滚动体验 | 快速滚动可能闪烁 | 预渲染缓冲区 + Skeleton loading |
| IndexedDB 存储限制 | 浏览器限制 50MB+ | 定期清理旧草稿 + 压缩存储 |
| 自动保存冲突 | 多设备编辑冲突 | 冲突检测 + 用户选择 + 合并工具 |

## Migration Plan

### Phase 1: 核心编辑器 (3w)

- TipTap 编辑器封装
- 基础块类型实现（段落/标题/代码/图片/引用）
- Slash 命令面板
- Markdown 快捷键

### Phase 2: 高级块类型 (2w)

- 表格块
- 数学公式块
- Mermaid 图表块
- Markdown 双向转换

### Phase 3: 渲染优化 (2w)

- DOM 渲染器
- 虚拟列表渲染器
- 渲染策略选择器

### Phase 4: 自动保存 (1w)

- IndexedDB 缓存
- 自动保存逻辑
- 冲突检测与恢复

### Phase 5: 集成与测试 (1w)

- 集成到 article 子应用
- 替换现有 textarea 编辑器
- 端到端测试

## Open Questions（已解决）

所有 Open Questions 已在 Decision 6 中解决。
