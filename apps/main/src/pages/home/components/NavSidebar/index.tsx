import {
  AppstoreOutlined,
  BookOutlined,
  CloudServerOutlined,
  CodeOutlined,
  MobileOutlined,
  RobotOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import styles from './navSidebar.module.less';

/** 首页左侧分类导航项 */
const NAV_ITEMS: { key: string; label: string; icon: ReactNode; gradient: string }[] = [
  {
    key: '',
    label: '综合',
    icon: <AppstoreOutlined />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    key: '后端',
    label: '后端',
    icon: <CloudServerOutlined />,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    key: '前端',
    label: '前端',
    icon: <CodeOutlined />,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    key: 'AI',
    label: 'AI',
    icon: <RobotOutlined />,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    key: '移动端',
    label: '移动端',
    icon: <MobileOutlined />,
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    key: '工具',
    label: '开发工具',
    icon: <ToolOutlined />,
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
  {
    key: '阅读',
    label: '阅读',
    icon: <BookOutlined />,
    gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  },
];

interface NavSidebarProps {
  activeTag: string;
  onTagChange: (tag: string) => void;
}

/** 首页左侧分类导航 — 点击切换文章 tag 筛选 */
export default function NavSidebar({ activeTag, onTagChange }: NavSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.title}>发现</div>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTag === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={() => onTagChange(item.key)}
          >
            <span
              className={styles.iconWrap}
              style={{ background: isActive ? item.gradient : undefined }}
            >
              {item.icon}
            </span>
            <span className={styles.label}>{item.label}</span>
            {isActive && <span className={styles.indicator} />}
          </button>
        );
      })}
    </nav>
  );
}
