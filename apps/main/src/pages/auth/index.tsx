import { LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import { Card, Tabs } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';

import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

/** 登录/注册页面 */
export default function AuthPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // 已登录用户自动跳转首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Luhanxin Community</h1>
          <p className="text-gray-500 mt-1">加入社区，分享你的想法</p>
        </div>

        <Tabs
          centered
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: (
                <span>
                  <LoginOutlined /> 登录
                </span>
              ),
              children: <LoginForm />,
            },
            {
              key: 'register',
              label: (
                <span>
                  <UserAddOutlined /> 注册
                </span>
              ),
              children: <RegisterForm />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
