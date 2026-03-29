import { LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, type MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from './userArea.module.less';

export default function UserArea() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

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

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人主页',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout();
        navigate('/');
      },
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
      <div className={styles.userArea}>
        <Avatar
          src={user.avatarUrl || undefined}
          icon={!user.avatarUrl ? <UserOutlined /> : undefined}
          size={28}
          className={styles.avatar}
        />
        <span className={styles.name}>{user.displayName || user.username}</span>
      </div>
    </Dropdown>
  );
}
