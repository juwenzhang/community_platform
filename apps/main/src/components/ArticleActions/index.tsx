import {
  ArrowLeftOutlined,
  EditOutlined,
  HeartFilled,
  HeartOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSocialStore } from '@/stores/useSocialStore';
import styles from './articleActions.module.less';

interface ArticleActionsProps {
  articleId: string;
  isAuthor: boolean;
}

export default function ArticleActions({ articleId, isAuthor }: ArticleActionsProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    liked,
    favorited,
    likeCount,
    favoriteCount,
    getInteraction,
    toggleLike,
    toggleFavorite,
    resetInteraction,
  } = useSocialStore();

  useEffect(() => {
    if (articleId) getInteraction(articleId);
    return () => resetInteraction();
  }, [articleId, getInteraction, resetInteraction]);

  const handleLike = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    toggleLike(articleId);
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    toggleFavorite(articleId);
  };

  return (
    <div className={styles.actions}>
      <Tooltip title={liked ? '取消点赞' : '点赞'} placement="right">
        <button
          type="button"
          className={`${styles.actionBtn} ${liked ? styles.active : ''}`}
          onClick={handleLike}
        >
          {liked ? <HeartFilled /> : <HeartOutlined />}
        </button>
        {likeCount > 0 && <span className={styles.count}>{likeCount}</span>}
      </Tooltip>

      <Tooltip title={favorited ? '取消收藏' : '收藏'} placement="right">
        <button
          type="button"
          className={`${styles.actionBtn} ${favorited ? styles.activeFavorite : ''}`}
          onClick={handleFavorite}
        >
          {favorited ? <StarFilled /> : <StarOutlined />}
        </button>
        {favoriteCount > 0 && <span className={styles.count}>{favoriteCount}</span>}
      </Tooltip>

      {isAuthor && (
        <Tooltip title="编辑" placement="right">
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => navigate(`/post/${articleId}/edit`)}
          >
            <EditOutlined />
          </button>
        </Tooltip>
      )}

      <div className={styles.divider} />

      <Tooltip title="返回首页" placement="right">
        <button type="button" className={styles.actionBtn} onClick={() => navigate('/')}>
          <ArrowLeftOutlined />
        </button>
      </Tooltip>
    </div>
  );
}
