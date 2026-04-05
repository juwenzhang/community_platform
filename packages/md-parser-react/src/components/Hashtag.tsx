export interface HashtagProps {
  /** 标签名 */
  tag: string;
  /** 点击回调 */
  onClick?: (tag: string) => void;
}

/**
 * #标签组件
 */
export function Hashtag({ tag, onClick }: HashtagProps) {
  const handleClick = () => {
    onClick?.(tag);
  };

  return (
    <a
      href={`/tag/${tag}`}
      className="hashtag"
      data-tag={tag}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      #{tag}
    </a>
  );
}
