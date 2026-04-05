/**
 * 事件处理器类型定义（框架无关）
 *
 * 用于事件代理系统。React/Vue 的 useEventDelegation 使用此类型
 * 在容器 div 上通过事件委托捕获渲染后 DOM 的交互事件。
 */
export interface EventHandlers {
  /** @mention 链接点击 */
  onMentionClick?: (username: string) => void;
  /** #hashtag 链接点击 */
  onHashtagClick?: (tag: string) => void;
  /** 图片点击（可用于 lightbox） */
  onImageClick?: (src: string, alt: string) => void;
  /** 普通链接点击（非 mention/hashtag） */
  onLinkClick?: (href: string) => void;
  /** 代码块复制按钮点击 */
  onCodeCopy?: (code: string, language: string) => void;
  /** 标题锚点点击 */
  onHeadingClick?: (id: string, level: number) => void;
}
