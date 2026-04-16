import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import type { VFile } from 'vfile';
import type { ContainerNode } from '../types/ast';

const CONTAINER_TYPES = ['tip', 'warning', 'info', 'danger'] as const;
type ContainerKind = (typeof CONTAINER_TYPES)[number];

const _OPEN_REGEX = /^:::(tip|warning|info|danger)(?:\s+(.+))?$/;
const _CLOSE_REGEX = /^:::$/;

interface ContainerInfo {
  kind: string;
  title?: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface RemarkContainerOptions {
  sourceContainers?: Map<string, ContainerInfo>;
}

/**
 * :::容器 remark 插件
 *
 * 当提供 sourceContainers，使用源文本中预提取的容器信息；
 * 否则回退到 AST 匹配模式（用于兼容）。
 */
export const remarkContainer: Plugin<[RemarkContainerOptions?], Root> = (options) => {
  return async (tree: Root, _file: VFile) => {
    // 如果提供了源文本容器信息，直接使用
    if (options?.sourceContainers && options.sourceContainers.size > 0) {
      transformContainersFromSource(tree, options.sourceContainers);
    }
  };
};

/**
 * 从源文本提供的容器信息构建 AST 节点
 * 此时 AST 中的容器块仍然是段落，我们需要根据源信息重建为 ContainerNode
 */
function transformContainersFromSource(
  parent: Parent,
  sourceContainers: Map<string, ContainerInfo>,
  processed: Set<number> = new Set(),
): void {
  // 获取源文本行号到容器信息的映射
  const lineToContainer = new Map<number, ContainerInfo>();
  for (const [_cid, info] of sourceContainers) {
    lineToContainer.set(info.startLine, info);
  }

  // 遍历 AST，根据源行号匹配容器块
  const newChildren: Node[] = [];
  let i = 0;

  while (i < parent.children.length) {
    const node = parent.children[i];
    const position = node.position;

    if (position?.start) {
      const sourceLine = position.start.line - 1; // remark 用 1-based 行号

      // 如果这一行已经被处理为容器，跳过
      if (processed.has(sourceLine)) {
        i++;
        continue;
      }

      const containerInfo = lineToContainer.get(sourceLine);

      if (containerInfo) {
        // 找到容器结束位置（从当前节点向后查找）
        let containerEndIndex = i;
        let lastSourceLine = sourceLine;

        for (let j = i; j < parent.children.length; j++) {
          const child = parent.children[j];
          if (child.position?.end?.line) {
            lastSourceLine = child.position.end.line - 1;
            containerEndIndex = j;
            if (lastSourceLine >= containerInfo.endLine) {
              break;
            }
          }
        }

        // 收集容器范围内的所有节点作为内容
        const contentNodes = parent.children.slice(i, containerEndIndex + 1);

        // 递归处理内容中的嵌套容器
        const containerContent = {
          type: 'root',
          children: [...contentNodes],
        } as unknown as Parent;

        // 传递已处理集合，避免无限递归
        const newProcessed = new Set(processed);
        for (const contentNode of contentNodes) {
          if (contentNode.position?.start?.line) {
            newProcessed.add(contentNode.position.start.line - 1);
          }
        }
        transformContainersFromSource(containerContent, sourceContainers, newProcessed);

        // 创建 ContainerNode
        const containerNode: ContainerNode = {
          type: 'container',
          kind: containerInfo.kind as ContainerKind,
          title: containerInfo.title,
          children: containerContent.children,
          data: {
            hName: 'container',
          },
        };

        newChildren.push(containerNode);
        i = containerEndIndex + 1;
        continue;
      }
    }

    // 非容器节点，不需要递归处理
    newChildren.push(node);
    i++;
  }

  parent.children = newChildren;
}
