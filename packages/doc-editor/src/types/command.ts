/**
 * 已废弃：Slash 命令类型从本文件迁移到 `src/slash/types.ts`
 *
 * 保留文件仅供向后兼容，后续版本会彻底删除。
 * 新代码请从 `@luhanxin/doc-editor` 顶层导入 `SlashCommandItem`。
 */

export interface CommandRange {
  from: number;
  to: number;
}
