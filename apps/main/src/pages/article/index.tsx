import { FileTextOutlined } from '@ant-design/icons';
import { Empty } from 'antd';

import styles from './article.module.less';

/** 文章模块 — 占位页面 */
export default function ArticlePage() {
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>
        <FileTextOutlined className={styles.icon} />
        技术文章
      </h2>
      <Empty description="文章模块即将上线，敬请期待 🚧" />
    </div>
  );
}
