import type { User } from '@luhanxin/shared-types';
import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from './commentSection.module.less';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** 紧凑模式（用于内联回复框） */
  compact?: boolean;
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = '写下你的评论...',
  inputRef: externalRef,
  compact = false,
}: MentionInputProps) {
  const { getUsers } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || localRef;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // 检测 @trigger
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const atMatch = /@([\w-]*)$/.exec(textBeforeCursor);

      if (atMatch) {
        setMentionStart(atMatch.index);
        setMentionQuery(atMatch[1]);
        setShowDropdown(true);

        // debounce 搜索用户
        clearTimeout(debounceRef.current);
        if (atMatch[1].length > 0) {
          debounceRef.current = setTimeout(async () => {
            try {
              const users = await getUsers(atMatch[1], { pageSize: 5, pageToken: '' });
              setSuggestions(users);
            } catch {
              setSuggestions([]);
            }
          }, 200);
        } else {
          setSuggestions([]);
        }
      } else {
        setShowDropdown(false);
        setSuggestions([]);
      }
    },
    [onChange, getUsers],
  );

  const handleSelectUser = (username: string) => {
    // 替换 @query 为 @username
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    const inserted = `@${username} `;
    const newValue = `${before}${inserted}${after}`;
    onChange(newValue);
    setShowDropdown(false);
    setSuggestions([]);

    // 聚焦回输入框 + 光标移到 @username 后面
    const cursorPos = mentionStart + inserted.length;
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className={styles.mentionInputWrapper}>
      <textarea
        ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${styles.commentTextarea} ${compact ? styles.compact : ''}`}
        rows={compact ? 2 : 3}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className={styles.mentionDropdown}>
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              className={styles.mentionItem}
              onClick={() => handleSelectUser(user.username)}
            >
              <span className={styles.mentionUsername}>@{user.username}</span>
              {user.displayName && (
                <span className={styles.mentionDisplayName}>{user.displayName}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
