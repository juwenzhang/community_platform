/**
 * 表格块
 *
 * 使用 TipTap 官方 4 个扩展组合：Table + TableRow + TableCell + TableHeader
 * 默认配置：可 resize 列宽、带 header 行
 */

import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';

export const TableExtensions = [
  Table.configure({
    resizable: true,
    HTMLAttributes: { class: 'editor-table' },
  }),
  TableRow,
  TableHeader,
  TableCell,
];
