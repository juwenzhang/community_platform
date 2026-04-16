import type { IGif } from '@giphy/js-types';
import { Grid } from '@giphy/react-components';
import type { MediaAttachment } from '@luhanxin/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gf, isGiphyAvailable } from '@/lib/giphy';
import styles from './expressionPicker.module.less';

interface GiphyGridProps {
  type: 'gifs' | 'stickers';
  onSelect: (media: MediaAttachment) => void;
}

export default function GiphyGrid({ type, onSelect }: GiphyGridProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setError(null); // 清除上次错误
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const fetchGifs = useCallback(
    (offset: number) => {
      const promise = debouncedQuery
        ? gf.search(debouncedQuery, { offset, limit: 20, type, lang: 'zh-CN' })
        : gf.trending({ offset, limit: 20, type });

      // 捕获错误用于 UI 显示和调试
      promise.catch((err) => {
        console.error('[GIPHY] fetch error:', err?.message || err, {
          type,
          query: debouncedQuery,
          offset,
          sdkKeyPrefix: import.meta.env.VITE_GIPHY_SDK_KEY?.slice(0, 8) + '...',
        });
        setError(err?.message || 'GIPHY 请求失败');
      });

      return promise;
    },
    [debouncedQuery, type],
  );

  const handleGifClick = useCallback(
    (gif: IGif, e: React.SyntheticEvent<HTMLElement, Event>) => {
      e.preventDefault();
      const mediaType = type === 'gifs' ? 1 : 2; // GIF=1, STICKER=2
      const images = gif.images;
      const original = images.original;
      const preview = images.fixed_height;

      onSelect({
        mediaType,
        url: original.url,
        previewUrl: preview.url,
        width: Number(original.width),
        height: Number(original.height),
        giphyId: String(gif.id),
        altText: gif.title || '',
        $typeName: 'luhanxin.community.v1.MediaAttachment',
      } as MediaAttachment);
    },
    [onSelect, type],
  );

  if (!isGiphyAvailable) {
    return <div className={styles.error}>GIPHY SDK Key 未配置，GIF/Sticker 功能不可用</div>;
  }

  return (
    <div className={styles.giphyContainer}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={type === 'gifs' ? '搜索 GIF...' : '搜索 Sticker...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <div className={styles.error}>
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              marginLeft: 8,
              color: '#1e80ff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      )}
      <div className={styles.gridWrapper}>
        <Grid
          key={`${type}-${debouncedQuery}-${error ? 'retry' : 'ok'}`}
          width={308}
          columns={2}
          gutter={6}
          fetchGifs={fetchGifs}
          onGifClick={handleGifClick}
          noLink
          hideAttribution
        />
      </div>
    </div>
  );
}
