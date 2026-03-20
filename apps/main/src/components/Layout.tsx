import { Layout as AntLayout, Menu } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { generateMenuItems } from '@/routes/menuFromRoutes';
import routes from '@/routes/routes';

const { Header, Sider, Content } = AntLayout;

export default function Layout() {
  const location = useLocation();
  const selectedKey = `/${location.pathname.split('/')[1] || ''}`;

  // 从路由配置自动生成菜单——只需维护一份数据
  const menuItems = useMemo(() => generateMenuItems(routes), []);

  return (
    <AntLayout className="min-h-screen">
      <Header className="flex items-center px-6 bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800 m-0">Luhanxin Community</h1>
        </div>
      </Header>
      <AntLayout>
        <Sider
          width={200}
          className="bg-white border-r border-gray-100"
          breakpoint="lg"
          collapsedWidth={64}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            className="border-none h-full pt-4"
          />
        </Sider>
        <Content className="p-6 bg-gray-50">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
