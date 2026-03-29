import { Tabs } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';

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
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-lg border border-[#e4e6eb] p-8">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#1e80ff] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-base">L</span>
            </div>
            <h1 className="text-lg font-semibold text-[#252933] mb-1">Luhanxin Community</h1>
            <p className="text-sm text-[#8a919f]">加入社区，和开发者一起成长</p>
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
