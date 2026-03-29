import { ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from './heroBanner.module.less';

export default function HeroBanner() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return null;

  return (
    <div className={styles.banner}>
      <h3 className={styles.title}>👋 欢迎来到 Luhanxin Community</h3>
      <p className={styles.desc}>技术社区平台 — 发现优秀开发者，分享知识、交流技术</p>
      <Button
        type="primary"
        size="small"
        icon={<ArrowRightOutlined />}
        onClick={() => navigate('/auth')}
        className={styles.joinBtn}
      >
        加入社区
      </Button>
    </div>
  );
}
