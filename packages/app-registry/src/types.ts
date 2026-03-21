// ============================================================
// @luhanxin/app-registry — Core Types
// ============================================================

/** 子应用类型 */
export type AppType = 'garfish' | 'iframe' | 'local';

/** 路由元信息（与 @/router 中 RouteMeta 对齐） */
export interface AppRouteMeta {
  /** 菜单标题 */
  title: string;
  /** Ant Design Icon 组件名 */
  icon?: string;
  /** 是否在菜单中隐藏 */
  hidden?: boolean;
  /** 是否需要登录 */
  auth?: boolean;
  /** 可访问角色列表 */
  roles?: string[];
}

/** 多环境入口配置 */
export interface EnvEntries {
  development: string;
  staging?: string;
  production: string;
  [env: string]: string | undefined;
}

/**
 * 子应用完整描述
 *
 * 单一数据源：从这个对象可以导出 Garfish 配置、路由配置、菜单配置
 */
export interface AppManifest {
  /** 子应用唯一名称（如 'feed'、'admin'） */
  name: string;
  /** 子应用入口 URL（当前环境） */
  entry: string;
  /** 路由激活路径（如 '/feed'） */
  activeWhen: string;
  /** 子应用类型，默认 'garfish' */
  type?: AppType;
  /** 路由元信息（用于菜单生成） */
  meta?: AppRouteMeta;
  /** 自定义健康检查 URL（默认使用 entry） */
  healthCheckUrl?: string;
  /** 传递给子应用的额外 props */
  props?: Record<string, unknown>;
  /** 多环境入口（EnvConfigProvider 使用） */
  envEntries?: EnvEntries;
}

/** 健康检查状态 */
export type HealthStatusValue = 'healthy' | 'unhealthy' | 'unknown' | 'checking';

/** 单个子应用的健康状态 */
export interface HealthStatus {
  /** 子应用名称 */
  name: string;
  /** 健康状态 */
  status: HealthStatusValue;
  /** 响应延迟 (ms) */
  latency?: number;
  /** 上次检查时间 */
  lastCheck?: Date;
  /** 错误信息 */
  error?: string;
}

/** 健康检查配置 */
export interface HealthCheckOptions {
  /** 是否启用健康检查 */
  enabled: boolean;
  /** 检查间隔 (ms)，0 表示不自动轮询 */
  interval: number;
  /** 请求超时 (ms) */
  timeout: number;
  /** 连续失败多少次标记为 unhealthy */
  unhealthyThreshold: number;
}

/**
 * 配置提供者接口
 *
 * 不同实现决定从哪里获取子应用配置：
 * - StaticConfigProvider: 硬编码配置
 * - EnvConfigProvider: 根据环境变量选择
 * - RemoteConfigProvider: 从远程 URL 拉取
 */
export interface ConfigProvider {
  /** 获取所有子应用配置 */
  getApps(): Promise<AppManifest[]>;
  /** 可选：监听配置变更 */
  watch?(callback: (apps: AppManifest[]) => void): () => void;
}

/** 注册表配置选项 */
export interface RegistryOptions {
  /** 配置提供者 */
  provider: ConfigProvider;
  /** 健康检查配置 */
  healthCheck?: Partial<HealthCheckOptions>;
}

/** 注册表事件类型 */
export type RegistryEventType = 'register' | 'unregister' | 'health-change' | 'config-update';

/** 注册表事件 */
export interface RegistryEvent {
  type: RegistryEventType;
  app?: AppManifest;
  apps?: AppManifest[];
  health?: HealthStatus;
}
