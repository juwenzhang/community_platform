import type { MediaAttachment } from '@luhanxin/shared-types';
import { useState } from 'react';
import EmojiPicker from '../CommentSection/EmojiPicker';
import styles from './expressionPicker.module.less';
import GiphyGrid from './GiphyGrid';

type TabKey = 'emoji' | 'gif' | 'sticker';

interface ExpressionPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onMediaSelect: (media: MediaAttachment) => void;
  onClose: () => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'emoji', label: '😀 Emoji' },
  { key: 'gif', label: '🎬 GIF' },
  { key: 'sticker', label: '✨ Sticker' },
];

export default function ExpressionPicker({
  onEmojiSelect,
  onMediaSelect,
  onClose,
}: ExpressionPickerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('emoji');

  const handleMediaSelect = (media: MediaAttachment) => {
    onMediaSelect(media);
    onClose();
  };

  return (
    <div className={styles.picker}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'emoji' && <EmojiPicker onSelect={onEmojiSelect} onClose={onClose} />}
        {activeTab === 'gif' && <GiphyGrid type="gifs" onSelect={handleMediaSelect} />}
        {activeTab === 'sticker' && <GiphyGrid type="stickers" onSelect={handleMediaSelect} />}
      </div>

      {activeTab !== 'emoji' && <div className={styles.attribution}>Powered by GIPHY</div>}
    </div>
  );
}
