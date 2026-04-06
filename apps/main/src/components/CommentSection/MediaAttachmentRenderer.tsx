import type { MediaAttachment } from '@luhanxin/shared-types';
import styles from './commentSection.module.less';

interface MediaAttachmentRendererProps {
  attachments: MediaAttachment[];
}

export default function MediaAttachmentRenderer({ attachments }: MediaAttachmentRendererProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={styles.mediaAttachments}>
      {attachments.map((ma) => {
        const isSticker = ma.mediaType === 2;
        return (
          <div
            key={ma.giphyId || ma.url}
            className={`${styles.mediaItem} ${isSticker ? styles.stickerItem : styles.gifItem}`}
          >
            <img src={ma.previewUrl || ma.url} alt={ma.altText || ''} loading="lazy" />
            <span className={styles.giphyBadge}>via GIPHY</span>
          </div>
        );
      })}
    </div>
  );
}
