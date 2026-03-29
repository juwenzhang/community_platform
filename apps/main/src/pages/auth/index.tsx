import { Tabs } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import styles from './auth.module.less';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

export default function AuthPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.logo}>L</div>
            <h1 className={styles.title}>Luhanxin Community</h1>
            <p className={styles.subtitle}>加入社区，和开发者一起成长</p>
          </div>

          <Tabs
            centered
            defaultActiveKey="login"
            items={[
              { key: 'login', label: '登录', children: <LoginForm /> },
              { key: 'register', label: '注册', children: <RegisterForm /> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
