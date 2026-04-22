/**
 * React + tippy Slash 命令 Renderer
 *
 * 思路：
 * - onStart: 创建 tippy 实例，初始渲染 React 组件
 * - onUpdate: 更新 React 组件 props（items/query 变化）
 * - onKeyDown: 调用组件暴露的 onKeyDown 处理方向键/回车
 * - onExit: 销毁 tippy + unmount React
 */

import { createElement, createRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { SlashCommandMenu, type SlashCommandMenuHandle } from './SlashCommandMenu';
import type { SlashCommandProps, SlashCommandRenderer } from './types';

export interface SlashRendererOptions {
  /** 分组标签映射 */
  groupLabels?: Record<string, string>;
  /** tippy 额外配置 */
  tippyOptions?: Parameters<typeof tippy>[1];
}

/**
 * 创建 React + tippy 的 Slash renderer 工厂
 */
export function createReactSlashRenderer(
  options: SlashRendererOptions = {},
): () => SlashCommandRenderer {
  return () => {
    let popup: TippyInstance | null = null;
    let container: HTMLDivElement | null = null;
    let root: Root | null = null;
    const handleRef = createRef<SlashCommandMenuHandle>();

    function renderElement(props: SlashCommandProps): ReactElement {
      return createElement(SlashCommandMenu, {
        ...props,
        groupLabels: options.groupLabels,
        ref: handleRef,
      });
    }

    return {
      onStart: (props) => {
        container = document.createElement('div');
        root = createRoot(container);
        root.render(renderElement(props));

        // 计算 tippy 锚点：用选区的 DOM rect
        const clientRect = () => {
          const rect = props.editor.view.coordsAtPos(props.range.from);
          return new DOMRect(rect.left, rect.top, 0, rect.bottom - rect.top);
        };

        popup = tippy(document.body, {
          getReferenceClientRect: clientRect,
          appendTo: () => document.body,
          content: container,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          arrow: false,
          offset: [0, 8],
          ...options.tippyOptions,
        });
      },

      onUpdate: (props) => {
        if (!root || !popup) return;
        root.render(renderElement(props));
        popup.setProps({
          getReferenceClientRect: () => {
            const rect = props.editor.view.coordsAtPos(props.range.from);
            return new DOMRect(rect.left, rect.top, 0, rect.bottom - rect.top);
          },
        });
      },

      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          popup?.hide();
          return true;
        }
        return handleRef.current?.onKeyDown(event) ?? false;
      },

      onExit: () => {
        popup?.destroy();
        popup = null;
        // React 18 要求在下一 tick unmount，避免 commit 冲突
        queueMicrotask(() => {
          root?.unmount();
          root = null;
          container = null;
        });
      },
    };
  };
}
