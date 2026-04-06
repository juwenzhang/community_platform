import { CloseOutlined } from '@ant-design/icons';
import type { MediaAttachment } from '@luhanxin/shared-types';
import styles from './expressionPicker.module.less';

interface MediaPreviewProps {
  media: MediaAttachment;
  onRemove: () => void;
}

export default function MediaPreview({ media, onRemove }: MediaPreviewProps) {
  const isSticker = media.mediaType === 2;

  return (
    <div className={`${styles.mediaPreview} ${isSticker ? styles.sticker : ''}`}>
      <img
        src={media.previewUrl || media.url}
        alt={media.altText || 'Media preview'}
        className={styles.previewImage}
      />
      <button type="button" className={styles.removeBtn} onClick={onRemove}>
        <CloseOutlined />
      </button>
      <span className={styles.mediaTag}>{isSticker ? 'Sticker' : 'GIF'}</span>
    </div>
  );
}
