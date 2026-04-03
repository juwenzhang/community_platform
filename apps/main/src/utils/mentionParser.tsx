import type { ReactNode } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 解析评论内容中的 @username 为可点击链接
 *
 * 输入: "Hello @zhangsan, check this out @lisi"
 * 输出: React 元素数组，@username 渲染为蓝色链接跳转 /user/:username
 */
export function parseMentions(content: string): ReactNode[] {
  const mentionRegex = /@([\w-]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while (true) {
    match = mentionRegex.exec(content);
    if (!match) break;

    // 普通文本部分
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // @username 链接
    const username = match[1];
    parts.push(
      React.createElement(
        Link,
        {
          key: `mention-${match.index}`,
          to: `/user/${username}`,
          style: { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 },
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
        `@${username}`,
      ),
    );

    lastIndex = match.index + match[0].length;
  }

  // 剩余文本
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}
