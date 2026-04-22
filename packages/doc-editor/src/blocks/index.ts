/**
 * 自定义块扩展集合
 *
 * Phase 2 已实现：
 * - CodeBlock (lowlight) / Table / TaskList   ← 集成型
 * - Image / Container / Mermaid / InlineMath / BlockMath   ← 自定义 Node schema
 *
 * Phase 3 将加入：SlashCommand / BubbleMenu / FloatingMenu
 * NodeView（代码复制按钮 / Mermaid 预览切换 / Math 编辑器）在 React 集成层实现
 */

export { CodeBlock, REGISTERED_LANGUAGES } from './code-block';
export type { ContainerAttrs, ContainerType } from './container';
export { CONTAINER_TYPES, Container } from './container';
export type { CloudinaryUploadHandlerOptions } from './image';
export {
  ALLOWED_IMAGE_TYPES,
  createCloudinaryUploadHandler,
  Image,
  MAX_IMAGE_SIZE,
} from './image';
export { BlockMath, InlineMath } from './math';
export { Mermaid } from './mermaid';
export { TableExtensions } from './table';
export { TaskListExtensions } from './task-list';
