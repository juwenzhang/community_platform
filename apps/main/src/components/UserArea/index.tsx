import {
  FormOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Popover } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from './userArea.module.less';

export default function UserArea() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <Button
        type="primary"
        size="small"
        icon={<LoginOutlined />}
        onClick={() => navigate('/auth')}
        className={styles.loginBtn}
      >
        登录
      </Button>
    );
  }

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  const panelContent = (
    <div className={styles.panel}>
      {/* 用户信息卡片 */}
      <div className={styles.userCard}>
        <Avatar
          src={user.avatarUrl || undefined}
          icon={!user.avatarUrl ? <UserOutlined /> : undefined}
          size={40}
        />
        <div className={styles.userInfo}>
          <div className={styles.displayName}>{user.displayName || user.username}</div>
          <div className={styles.username}>@{user.username}</div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 功能入口 */}
      <div
        className={styles.menuItem}
        onClick={() => handleNav(`/user/${user.username}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleNav(`/user/${user.username}`);
        }}
        role="menuitem"
        tabIndex={0}
      >
        <UserOutlined />
        <span>我的主页</span>
      </div>
      <div
        className={styles.menuItem}
        onClick={() => handleNav('/profile')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleNav('/profile');
        }}
        role="menuitem"
        tabIndex={0}
      >
        <SettingOutlined />
        <span>编辑资料</span>
      </div>
      <div
        className={styles.menuItem}
        onClick={() => handleNav('/profile/manage')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleNav('/profile/manage');
        }}
        role="menuitem"
        tabIndex={0}
      >
        <FormOutlined />
        <span>创作中心</span>
      </div>

      <div className={styles.divider} />

      <div
        className={`${styles.menuItem} ${styles.danger}`}
        onClick={handleLogout}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleLogout();
        }}
        role="menuitem"
        tabIndex={0}
      >
        <LogoutOutlined />
        <span>退出登录</span>
      </div>
    </div>
  );

  return (
    <Popover
      content={panelContent}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      arrow={false}
      overlayStyle={{ padding: 0 }}
    >
      <div className={styles.userArea}>
        <Avatar
          src={user.avatarUrl || undefined}
          icon={!user.avatarUrl ? <UserOutlined /> : undefined}
          size={28}
          className={styles.avatar}
        />
        <span className={styles.name}>{user.displayName || user.username}</span>
      </div>
    </Popover>
  );
}
