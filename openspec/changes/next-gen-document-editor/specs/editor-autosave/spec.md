## ADDED Requirements

### Requirement: IndexedDB 草稿存储

包 SHALL 提供 `DraftStore` 类作为 IndexedDB 的封装，存储编辑器草稿，支持按 articleId 查询、清理过期草稿。

数据库 schema：

```typescript
interface Draft {
  id: string;                  // UUID 或 `${articleId}-${userId}`
  articleId: string | null;    // 现有文章为 articleId，新建为 null
  contentJson: ProseMirrorJSON; // 编辑器原生格式（避免来回转换损耗）
  contentMarkdown: string;      // 序列化后的 Markdown（用于远程保存）
  updatedAt: number;            // 时间戳（毫秒）
  version: number;              // 本地版本号（每次保存递增）
}
```

数据库名：`luhanxin-doc-editor`，object store：`drafts`，主键：`id`，索引：`articleId`、`updatedAt`。

API：

```typescript
class DraftStore {
  async saveDraft(draft: Draft): Promise<void>;
  async loadDraft(id: string): Promise<Draft | null>;
  async loadByArticleId(articleId: string): Promise<Draft | null>;
  async listDrafts(): Promise<Draft[]>;
  async deleteDraft(id: string): Promise<void>;
  async cleanupOld(maxAgeDays?: number, maxCount?: number): Promise<number>;
}
```

#### Scenario: 保存与读取

- **WHEN** 调用 `saveDraft({ id: 'a', ... })` 后调用 `loadDraft('a')`
- **THEN** 返回的 Draft 与保存的内容等价（含 contentJson 和 contentMarkdown）

#### Scenario: 按 articleId 查询

- **WHEN** 已存在 articleId 为 `123` 的草稿，调用 `loadByArticleId('123')`
- **THEN** 返回对应 Draft

#### Scenario: 清理过期草稿

- **WHEN** 调用 `cleanupOld(30, 50)`
- **THEN** 删除 updatedAt 早于 30 天前的草稿，且若总数仍超 50 则删除最老的多余项；返回删除数量

#### Scenario: 浏览器不支持 IndexedDB 时的降级

- **WHEN** 浏览器禁用或不支持 IndexedDB
- **THEN** DraftStore 退化为 in-memory Map，console.warn 提示，编辑器仍可工作

---

### Requirement: useAutosave Hook

包 SHALL 提供 `useAutosave` Hook，封装防抖本地保存 + 定时远程保存的完整逻辑。

```typescript
interface AutosaveOptions {
  articleId?: string;
  debounceMs?: number;          // 默认 800
  intervalMs?: number;          // 默认 30000
  onRemoteSave?: (markdown: string) => Promise<void>;
}

interface AutosaveResult {
  status: SaveStatus;
  lastSavedAt: Date | null;
  forceSave: () => Promise<void>;
  hasDraft: boolean;
}

type SaveStatus =
  | 'idle'
  | 'saving-local'
  | 'saved-local'
  | 'saving-remote'
  | 'saved-remote'
  | 'error';

function useAutosave(editor: Editor | null, options: AutosaveOptions): AutosaveResult;
```

#### Scenario: 防抖本地保存

- **WHEN** 用户在 800ms 内连续输入
- **THEN** 仅在最后一次输入后 800ms 触发一次 IndexedDB 写入

#### Scenario: 定时远程保存

- **WHEN** 持续编辑超过 intervalMs
- **THEN** 触发一次 `onRemoteSave(markdown)` 调用，状态依次切换 `saving-remote` → `saved-remote`

#### Scenario: 远程保存失败重试

- **WHEN** `onRemoteSave` 抛错
- **THEN** status 设为 `error`，本地草稿保留，下次定时器或手动触发时重试

#### Scenario: 强制保存

- **WHEN** 调用 `forceSave()`
- **THEN** 立即触发本地 + 远程保存（跳过防抖和定时器）

#### Scenario: 保存后清理本地草稿

- **WHEN** `onRemoteSave` 成功完成
- **THEN** 对应 articleId 的本地草稿从 IndexedDB 删除

---

### Requirement: 草稿恢复流程

编辑器加载时 SHALL 检查本地草稿，若存在且更新时间晚于服务端版本，提示用户恢复。

#### Scenario: 检测到本地新于服务端

- **WHEN** 编辑现有文章，本地草稿 `updatedAt > article.updatedAt`
- **THEN** 弹出 `<DraftRestorePrompt>`：「检测到本地未保存草稿（HH:MM），是否恢复？[恢复] [放弃]」

#### Scenario: 用户选择恢复

- **WHEN** 点击「恢复」
- **THEN** 编辑器内容从本地草稿加载（contentJson）

#### Scenario: 用户选择放弃

- **WHEN** 点击「放弃」
- **THEN** 删除本地草稿，编辑器加载服务端版本

#### Scenario: 服务端新于本地

- **WHEN** `article.updatedAt > 草稿.updatedAt`
- **THEN** 不弹窗，直接加载服务端版本，删除过期本地草稿

---

### Requirement: 保存状态指示器

包 SHALL 提供 `<SaveStatusIndicator>` 组件展示当前保存状态，可被消费方放置在编辑器顶栏。

显示规则：

| status | 显示文案 | 可交互 |
|--------|---------|--------|
| idle | （不显示）| —— |
| saving-local | 正在保存... | —— |
| saved-local | 已保存到本地 | —— |
| saving-remote | 正在同步... | —— |
| saved-remote | 已同步 · HH:MM | —— |
| error | 保存失败 · 重试 | 点击触发 forceSave |

#### Scenario: 状态变化更新文案

- **WHEN** 编辑器状态从 `saving-local` 切换到 `saved-local`
- **THEN** 指示器文案对应更新

#### Scenario: 错误时可重试

- **WHEN** status 为 error，用户点击文案
- **THEN** 触发 forceSave，状态重新进入 saving 流程

---

### Requirement: 离线编辑支持

编辑器 SHALL 监听浏览器网络状态，离线时停用远程保存，仅本地保存；网络恢复时立即同步一次。

#### Scenario: 离线时跳过远程保存

- **WHEN** `navigator.onLine === false`
- **THEN** 定时器到达时不调用 `onRemoteSave`，status 保持 `saved-local`

#### Scenario: 离线提示条

- **WHEN** 检测到 `offline` 事件
- **THEN** 编辑器顶部显示提示条：「当前离线，内容仅保存到本地」

#### Scenario: 恢复在线立即同步

- **WHEN** 检测到 `online` 事件
- **THEN** 立即触发一次 forceSave；提示条消失

---

### Requirement: 范围限定于前端草稿层

本 capability SHALL 只实现前端 IndexedDB 草稿与防抖/定时保存逻辑，NOT 引入任何后端 schema、RPC、或 UI 用于服务端版本快照管理。

明确不包含的内容：
- 不新增 `article_draft_versions` 数据表
- 不新增 `SaveDraftVersion` 类 RPC
- 不实现版本对比、版本回滚、版本列表 UI

服务端版本快照能力由未来的 `editor-versioning` change 承接。

#### Scenario: Proto 不变

- **WHEN** 检查 `proto/luhanxin/community/v1/article.proto`
- **THEN** 不存在为本 change 新增的 RPC 或 message

#### Scenario: 后端服务不变

- **WHEN** 检查 `services/svc-content/`
- **THEN** 没有为草稿/版本管理新增的 handler 或 service
