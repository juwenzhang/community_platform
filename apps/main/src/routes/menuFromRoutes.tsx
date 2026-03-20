import {
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  ReadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Link } from 'react-router-dom';
import type { RouteConfig } from './index';

type MenuItem = Required<MenuProps>['items'][number];

/** Icon 字符串 → React 组件映射 */
const iconMap: Record<string, React.ReactNode> = {
  HomeOutlined: <HomeOutlined />,
  ReadOutlined: <ReadOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  UserOutlined: <UserOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  SettingOutlined: <SettingOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
};

/**
 * 从路由配置表自动生成 Ant Design Menu items
 *
 * - 自动过滤 hidden 路由
 * - 自动映射 icon
 * - 自动生成 Link
 */
export function generateMenuItems(routes: RouteConfig[]): MenuItem[] {
  return routes
    .filter((route) => route.meta && !route.meta.hidden)
    .map((route) => {
      const { path, meta } = route;
      const menuPath = path.replace('/*', '').replace(/\/$/, '') || '/';

      const item: MenuItem = {
        key: menuPath,
        icon: meta?.icon ? iconMap[meta.icon] : undefined,
        label: <Link to={menuPath}>{meta?.title}</Link>,
      };

      return item;
    });
}
