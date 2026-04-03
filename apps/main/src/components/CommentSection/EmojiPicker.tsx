import { useState } from 'react';
import styles from './commentSection.module.less';

const EMOJI_GROUPS = [
  {
    label: '常用',
    emojis: [
      '😀',
      '😂',
      '🤣',
      '😍',
      '🥰',
      '😎',
      '🤔',
      '👍',
      '👏',
      '🎉',
      '🔥',
      '❤️',
      '💯',
      '✅',
      '⭐',
      '🚀',
      '🎈',
      '🎊',
      '🎁',
      '🎀',
      '🎂',
      '🎄',
      '🎉',
    ],
  },
  {
    label: '表情',
    emojis: [
      '😊',
      '😇',
      '🙂',
      '😉',
      '😌',
      '😋',
      '🤗',
      '🤩',
      '😏',
      '😒',
      '😔',
      '😢',
      '😭',
      '😤',
      '🤯',
      '😱',
      '😖',
      '😣',
      '😥',
      '😧',
      '😩',
      '😪',
      '😫',
    ],
  },
  {
    label: '手势',
    emojis: [
      '👋',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '👌',
      '🙏',
      '💪',
      '🤝',
      '👊',
      '✊',
      '🖐️',
      '☝️',
      '👆',
      '👇',
      '👉',
      '👈',
      '👍',
      '👎',
      '👏',
      '👌',
      '👏',
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className={styles.emojiPicker}>
      <div className={styles.emojiTabs}>
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            className={`${styles.emojiTab} ${i === activeGroup ? styles.active : ''}`}
            onClick={() => setActiveGroup(i)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className={styles.emojiGrid}>
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.emojiItem}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
