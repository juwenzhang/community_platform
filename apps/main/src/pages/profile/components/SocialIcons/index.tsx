import { GithubOutlined, GlobalOutlined, LinkedinOutlined, WeiboOutlined } from '@ant-design/icons';
import type { SocialLink } from '@luhanxin/shared-types';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';

import styles from './socialIcons.module.less';

/** 平台 → 图标 + 颜色 + 标签映射 */
const PLATFORM_MAP: Record<string, { icon: ReactNode; color: string; label: string }> = {
  github: { icon: <GithubOutlined />, color: '#333', label: 'GitHub' },
  twitter: {
    icon: <span className={styles.customIcon}>𝕏</span>,
    color: '#1da1f2',
    label: 'Twitter/X',
  },
  weibo: { icon: <WeiboOutlined />, color: '#e6162d', label: '微博' },
  linkedin: { icon: <LinkedinOutlined />, color: '#0077b5', label: 'LinkedIn' },
  juejin: { icon: <span className={styles.customIcon}>掘</span>, color: '#1e80ff', label: '掘金' },
  zhihu: { icon: <span className={styles.customIcon}>知</span>, color: '#0066ff', label: '知乎' },
  bilibili: { icon: <span className={styles.customIcon}>B</span>, color: '#fb7299', label: 'B站' },
  website: { icon: <GlobalOutlined />, color: '#8a919f', label: '个人网站' },
};

interface SocialIconsProps {
  links: SocialLink[];
}

export default function SocialIcons({ links }: SocialIconsProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className={styles.socialIcons}>
      {links.map((link) => {
        const config = PLATFORM_MAP[link.platform] || PLATFORM_MAP.website;
        return (
          <Tooltip key={`${link.platform}-${link.url}`} title={config.label}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconLink}
              style={{ color: config.color }}
            >
              {config.icon}
            </a>
          </Tooltip>
        );
      })}
    </div>
  );
}
