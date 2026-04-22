import {
  BlockHandle,
  BubbleMenu,
  createReactSlashRenderer,
  DraftRestorePrompt,
  defaultSlashCommands,
  FloatingMenu,
  getDefaultExtensions,
  jsonToMarkdown,
  markdownToJson,
  SaveStatusIndicator,
  SlashCommand,
  type UploadHandler,
  useAutosave,
  useDraftRestore,
} from '@luhanxin/doc-editor';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';

const SAMPLE_MARKDOWN = `# @luhanxin/doc-editor

## Phase 4 持久化层 · 新特性

- **自动保存本地**：每次编辑防抖 800ms 写 IndexedDB
- **自动远程同步**：每 30s 调用 \`onRemoteSave\`（demo 中模拟）
- **草稿恢复**：关闭页面再打开若本地比服务端新会弹窗
- **离线降级**：断网时仅本地保存，联网后自动同步
- **Cmd+S 强制保存**：立即触发一次远程保存

试试：
- 编辑几下，底部看"正在保存 → 已保存到本地 → 已同步"
- 打开 DevTools → Network 切到 Offline，再编辑
- 关闭标签页再打开，看是否提示恢复草稿
`;

const mockUploadHandler: UploadHandler = {
  async upload(file) {
    if (Array.isArray(file)) throw new Error('demo 不支持数组');
    await new Promise((r) => setTimeout(r, 1500));
    const seed = Math.floor(Math.random() * 1000);
    return {
      url: `https://picsum.photos/seed/${seed}/800/400`,
      alt: file.name.replace(/\.[^.]+$/, ''),
    };
  },
};

/** 模拟"服务端最新 updatedAt"：demo 中用 localStorage 记录模拟值 */
function getMockServerUpdatedAt(articleId: string): number {
  const v = localStorage.getItem(`mock-server-${articleId}`);
  return v ? Number(v) : 0;
}
function setMockServerUpdatedAt(articleId: string, ts: number): void {
  localStorage.setItem(`mock-server-${articleId}`, String(ts));
}

/** 模拟远程保存 */
async function mockRemoteSave(articleId: string, markdown: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  const now = Date.now();
  setMockServerUpdatedAt(articleId, now);
  localStorage.setItem(`mock-content-${articleId}`, markdown);
  console.log(`[demo] 模拟远程保存 article ${articleId}:`, markdown.length, '字符');
}

export function App() {
  const [markdown, setMarkdown] = useState('');
  const [toast, setToast] = useState<string>('');
  const [stats, setStats] = useState({ characters: 0, words: 0, readingTime: 1 });

  // demo 固定用一个 articleId 便于观察草稿恢复
  const articleId = 'demo-article-001';
  const draftId = articleId;

  const slashExtension = useMemo(
    () =>
      SlashCommand.configure({
        items: defaultSlashCommands,
        render: createReactSlashRenderer(),
      }),
    [],
  );

  const editor = useEditor({
    extensions: [
      ...getDefaultExtensions({
        placeholder: '输入 / 快速插入，或直接开始书写...',
        imageUpload: {
          uploadHandler: mockUploadHandler,
          folder: 'demo-images',
          onUploadStart: (file) => setToast(`上传中 ${file.name}...`),
          onUploadComplete: (file) => {
            setToast(`✓ ${file.name} 上传完成`);
            setTimeout(() => setToast(''), 2000);
          },
          onError: (err) => {
            setToast(`✗ ${err.message}`);
            setTimeout(() => setToast(''), 3000);
          },
        },
        smartPaste: { markdownToJson },
      }),
      slashExtension,
    ],
    content: undefined,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // biome-ignore lint/suspicious/noExplicitAny: tiptap JSONContent 兼容
      setMarkdown(jsonToMarkdown(json as any));
      const wc = editor.storage.wordCount;
      if (wc) setStats({ ...wc });
    },
  });

  // 初始内容：优先从 mock 服务端拿，fallback 示例
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    const serverContent = localStorage.getItem(`mock-content-${articleId}`) ?? SAMPLE_MARKDOWN;
    markdownToJson(serverContent).then((json) => {
      if (cancelled) return;
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      editor.commands.setContent(json as any, false);
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      setMarkdown(jsonToMarkdown(editor.getJSON() as any));
      const wc = editor.storage.wordCount;
      if (wc) setStats({ ...wc });
    });
    return () => {
      cancelled = true;
    };
  }, [editor]);

  // ── 草稿恢复 ──
  const { pendingDraft, restore, discard } = useDraftRestore({
    editor,
    draftId,
    serverUpdatedAt: getMockServerUpdatedAt(articleId),
  });

  // ── 自动保存 ──
  const autosave = useAutosave({
    editor,
    draftId,
    articleId,
    onRemoteSave: async (md) => mockRemoteSave(articleId, md),
    debounceMs: 800,
    intervalMs: 10_000, // demo 里用 10s 方便观察
  });

  // Cmd+S 强制保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        autosave.forceSave().then(() => {
          setToast('已立即同步');
          setTimeout(() => setToast(''), 1500);
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autosave]);

  const handleLoadSample = () => {
    if (!editor) return;
    markdownToJson(SAMPLE_MARKDOWN).then((json) => {
      // biome-ignore lint/suspicious/noExplicitAny: 同上
      editor.commands.setContent(json as any, true);
    });
  };

  const handleClear = () => {
    if (!editor) return;
    editor.commands.clearContent();
  };

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1 className="app-title">@luhanxin/doc-editor Demo</h1>
          <p className="app-subtitle">
            Phase 1 + 2 + 3 + 4：块 · 交互 · 持久化（本地防抖 + 远程 10s + 离线降级 + 草稿恢复）
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" onClick={handleLoadSample}>
            载入示例
          </button>
          <button type="button" className="btn" onClick={handleClear}>
            清空
          </button>
          <button type="button" className="btn btn-primary" onClick={() => autosave.forceSave()}>
            立即同步 (Cmd+S)
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>编辑器</span>
          <SaveStatusIndicator
            status={autosave.status}
            lastRemoteSavedAt={autosave.lastRemoteSavedAt}
            lastLocalSavedAt={autosave.lastLocalSavedAt}
            lastError={autosave.lastError}
            isOffline={autosave.isOffline}
            onRetry={() => autosave.forceSave()}
          />
        </div>
        <div className="panel-body" style={{ position: 'relative' }}>
          <EditorContent editor={editor} />
          {editor && (
            <>
              <BubbleMenu editor={editor} />
              <FloatingMenu editor={editor} />
              <BlockHandle editor={editor} />
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Markdown 输出</span>
          <span style={{ fontWeight: 'normal', color: '#8a919f' }}>{markdown.length} 字符</span>
        </div>
        <div className="panel-body">
          <pre className="markdown-output">{markdown || '（暂无内容）'}</pre>
        </div>
      </div>

      <div className="status-bar">
        <span>
          字符数：<strong>{stats.characters}</strong>
        </span>
        <span>
          字数：<strong>{stats.words}</strong>
        </span>
        <span>
          预计阅读：<strong>{stats.readingTime} 分钟</strong>
        </span>
        <span>
          测试：<strong style={{ color: '#52c41a' }}>56/56 通过</strong>
        </span>
        <span>
          构建：<strong>41.32 KB</strong>
        </span>
        <span>
          网络：
          <strong style={{ color: autosave.isOffline ? '#f5222d' : '#52c41a' }}>
            {autosave.isOffline ? '离线' : '在线'}
          </strong>
        </span>
      </div>

      {/* 草稿恢复弹窗 */}
      <DraftRestorePrompt draft={pendingDraft} onRestore={restore} onDiscard={discard} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
