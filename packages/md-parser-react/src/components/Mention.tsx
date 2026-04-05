export interface MentionProps {
  /** 用户名 */
  username: string;
  /** 点击回调 */
  onClick?: (username: string) => void;
}

/**
 * @用户提及组件
 */
export function Mention({ username, onClick }: MentionProps) {
  const handleClick = () => {
    onClick?.(username);
  };

  return (
    <a
      href={`/user/${username}`}
      className="mention"
      data-username={username}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      @{username}
    </a>
  );
}
