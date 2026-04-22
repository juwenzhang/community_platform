/**
 * Slash 命令面板 UI 组件
 *
 * - 支持键盘导航（↑↓ Enter Esc）
 * - 按 group 分组展示
 * - 当前选中项高亮 + 滚动进入视图
 *
 * 设计要点：
 *   渲染时先把原始 items 按 group 重排成"展示列表"（displayItems），
 *   然后 selectedIndex 对应的是 displayItems 的下标，
 *   键盘导航 / 鼠标 hover / 点击 / Enter 全部基于 displayItems，保证视觉与行为一致。
 *
 * 样式通过 className hook 暴露给使用方，默认样式由消费方的 CSS 提供。
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defaultGroupLabels } from './defaultCommands';
import type { SlashCommandItem, SlashCommandProps } from './types';

export interface SlashCommandMenuHandle {
  /** 由 renderer 在 keydown 事件回调中使用 */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export interface SlashCommandMenuProps extends SlashCommandProps {
  /** 分组标签映射（可覆盖默认） */
  groupLabels?: Record<string, string>;
}

/**
 * 把原始 items 按 group 重排成展示列表（分组内部保持原顺序）。
 * 返回展示用的扁平列表 + 每项所属分组 ID。
 */
function buildDisplayItems(
  items: SlashCommandItem[],
): Array<{ item: SlashCommandItem; group: string; indexInGroup: number }> {
  const buckets = new Map<string, SlashCommandItem[]>();
  // 1. 按 group 分桶（保持插入顺序即 group 首次出现顺序）
  for (const item of items) {
    const group = item.group ?? 'other';
    const list = buckets.get(group) ?? [];
    list.push(item);
    buckets.set(group, list);
  }
  // 2. 平铺成带分组 index 的 flat 列表
  const flat: Array<{ item: SlashCommandItem; group: string; indexInGroup: number }> = [];
  for (const [group, groupItems] of buckets) {
    groupItems.forEach((item, idx) => {
      flat.push({ item, group, indexInGroup: idx });
    });
  }
  return flat;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  function SlashCommandMenu({ items, command, groupLabels }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const labels = useMemo(() => ({ ...defaultGroupLabels, ...groupLabels }), [groupLabels]);

    // 按 group 重排的展示列表（全局单一的 flat 数组，下标与视觉顺序 1:1）
    const displayItems = useMemo(() => buildDisplayItems(items), [items]);

    // items/displayItems 变化时重置选中到第一项
    useEffect(() => {
      setSelectedIndex(0);
    }, []);

    // 选中项滚动进入视图
    useLayoutEffect(() => {
      const el = itemRefs.current[selectedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    // 执行命令：统一从 displayItems 取（不是原始 items）
    const selectItem = useCallback(
      (index: number) => {
        const entry = displayItems[index];
        if (entry) command(entry.item);
      },
      [displayItems, command],
    );

    const handleArrowUp = useCallback(() => {
      setSelectedIndex((i) => (i + displayItems.length - 1) % displayItems.length);
    }, [displayItems.length]);

    const handleArrowDown = useCallback(() => {
      setSelectedIndex((i) => (i + 1) % displayItems.length);
    }, [displayItems.length]);

    const handleEnter = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === 'ArrowUp') {
            handleArrowUp();
            return true;
          }
          if (event.key === 'ArrowDown') {
            handleArrowDown();
            return true;
          }
          if (event.key === 'Enter') {
            handleEnter();
            return true;
          }
          return false;
        },
      }),
      [handleArrowUp, handleArrowDown, handleEnter],
    );

    if (displayItems.length === 0) {
      return (
        <div className="doc-editor-slash-menu doc-editor-slash-menu--empty">
          <div className="doc-editor-slash-menu__empty">无匹配命令</div>
        </div>
      );
    }

    // 重置 refs 数组长度
    itemRefs.current.length = displayItems.length;

    return (
      <div className="doc-editor-slash-menu" role="listbox">
        {displayItems.map((entry, index) => {
          const { item, group, indexInGroup } = entry;
          const isSelected = index === selectedIndex;
          const isFirstInGroup = indexInGroup === 0;
          return (
            <div key={item.id} className="doc-editor-slash-menu__row">
              {isFirstInGroup && (
                <div className="doc-editor-slash-menu__group-label">{labels[group] ?? group}</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={
                  isSelected
                    ? 'doc-editor-slash-menu__item doc-editor-slash-menu__item--selected'
                    : 'doc-editor-slash-menu__item'
                }
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectItem(index)}
              >
                {item.icon && <span className="doc-editor-slash-menu__icon">{item.icon}</span>}
                <span className="doc-editor-slash-menu__content">
                  <span className="doc-editor-slash-menu__title">{item.title}</span>
                  {item.description && (
                    <span className="doc-editor-slash-menu__description">{item.description}</span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    );
  },
);
