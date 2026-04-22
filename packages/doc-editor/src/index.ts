/**
 * @luhanxin/doc-editor
 *
 * TipTap 块编辑器 — 为 Luhanxin 社区平台提供统一的文档编辑能力
 *
 * Phase 1 已实现：
 *   - 包基础设施（构建、类型）
 *   - Editor 工厂 + 默认扩展
 *   - Markdown ↔ ProseMirror JSON 双向转换
 *
 * Phase 2 已实现：
 *   - CodeBlock (lowlight 高亮)
 *   - Table / TaskList / Image 集成扩展
 *   - Container (tip/warning/info/danger) 自定义块
 *   - Mermaid / InlineMath / BlockMath 自定义块
 *   - Cloudinary 上传 handler 默认实现
 *
 * Phase 3 已实现：
 *   - Slash 命令（SlashCommand Extension + React Renderer + 15 个默认命令）
 *   - Bubble Menu（选中文本格式工具条）
 *   - Floating Menu（空行插入工具条）
 *   - BlockHandle（块级操作菜单 — 上移/下移/复制/删除）
 *
 * 后续 Phase 将实现：
 *   - IndexedDB 草稿 + 自动保存（Phase 4）
 *   - React 集成层增强 — NodeView / Provider / ErrorBoundary（Phase 4-5）
 */

export type {
  Draft,
  DraftRestorePromptProps,
  SaveStatus,
  SaveStatusIndicatorProps,
  UseAutosaveOptions,
  UseAutosaveResult,
  UseDraftRestoreOptions,
  UseDraftRestoreResult,
} from './autosave';
// Autosave 持久化（Phase 4）
export {
  cleanupOld,
  clearAll,
  closeDB,
  DB_NAME,
  DB_VERSION,
  DEFAULT_MAX_DRAFTS,
  DEFAULT_RETENTION_DAYS,
  DraftRestorePrompt,
  deleteDraft,
  listDrafts,
  loadByArticleId,
  loadDraft,
  SaveStatusIndicator,
  STORE_NAME,
  saveDraft,
  useAutosave,
  useDraftRestore,
  useOnlineStatus,
} from './autosave';
export type { CloudinaryUploadHandlerOptions, ContainerAttrs, ContainerType } from './blocks';

// 自定义块扩展（消费方可单独引用）
export {
  ALLOWED_IMAGE_TYPES,
  BlockMath,
  CONTAINER_TYPES,
  CodeBlock,
  Container,
  createCloudinaryUploadHandler,
  Image,
  InlineMath,
  MAX_IMAGE_SIZE,
  Mermaid,
  REGISTERED_LANGUAGES,
  TableExtensions,
  TaskListExtensions,
} from './blocks';
// Markdown 转换器
export { jsonToMarkdown, markdownToJson } from './convert';
export type { DefaultExtensionsOptions } from './core';
// 核心工厂
export { createEditor, getDefaultExtensions } from './core';
export type { ImageUploadOptions, SmartPasteOptions, WordCountStats } from './interactions';
// 交互增强（Phase 3+）
export {
  countCharacters,
  countWords,
  ExtraKeybindings,
  estimateReadingTime,
  ImageUpload,
  SmartPaste,
  WordCount,
} from './interactions';
export type {
  BlockHandleProps,
  BubbleMenuItem,
  BubbleMenuProps,
  EditorTocProps,
  FloatingMenuItem,
  FloatingMenuProps,
  TocItem,
} from './menu';
// Menu 组件
export {
  BlockHandle,
  BubbleMenu,
  defaultBubbleItems,
  defaultFloatingItems,
  EditorToc,
  FloatingMenu,
} from './menu';
export type {
  DocEditorContextValue,
  DocEditorProps,
  DocEditorProviderProps,
} from './react';
// React 集成层（Phase 5）
export { DocEditor, DocEditorProvider, useDocEditorContext } from './react';
export type {
  SlashCommandGroup,
  SlashCommandItem,
  SlashCommandMenuHandle,
  SlashCommandMenuProps,
  SlashCommandOptions,
  SlashCommandProps,
  SlashCommandRenderer,
  SlashRendererOptions,
} from './slash';
// Slash 命令
export {
  createReactSlashRenderer,
  defaultGroupLabels,
  defaultSlashCommands,
  runSlashCommand,
  SlashCommand,
  SlashCommandMenu,
} from './slash';

// 类型定义
export type {
  CommandRange,
  CreateEditorOptions,
  ProseMirrorJSON,
  UploadHandler,
  UploadOptions,
  UploadResult,
} from './types';
