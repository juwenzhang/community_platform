import { ArrowLeftOutlined, EditOutlined, HeartOutlined, StarOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './articleActions.module.less';

interface ArticleActionsProps {
  articleId: string;
  likeCount: number;
  isAuthor: boolean;
}

export default function ArticleActions({ articleId, likeCount, isAuthor }: ArticleActionsProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.actions}>
      <Tooltip title="点赞" placement="right">
        <button type="button" className={styles.actionBtn}>
          <HeartOutlined />
          {likeCount > 0 && <span className={styles.count}>{likeCount}</span>}
        </button>
      </Tooltip>

      <Tooltip title="收藏" placement="right">
        <button type="button" className={styles.actionBtn}>
          <StarOutlined />
        </button>
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
