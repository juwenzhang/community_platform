/**
 * 开发态服务注册条目
 *
 * 每个子应用 Vite dev server 启动后，会往共享注册文件写入一条记录。
 */
export interface DevRegistryEntry {
  /** 子应用名称（与 app-registry 中 AppManifest.name 对应） */
  name: string;
  /** Vite dev server 实际监听的 URL（含自动分配的端口） */
  url: string;
  /** 配置的首选端口（可能与实际不同） */
  preferredPort: number;
  /** 实际端口 */
  resolvedPort: number;
  /** 启动时间戳 */
  startedAt: number;
  /** 进程 PID */
  pid: number;
}

/**
 * 共享注册文件的完整内容
 *
 * 文件路径：{monorepo_root}/.dev-registry.json
 */
export interface DevRegistryFile {
  /** 文件版本（用于未来兼容） */
  version: 1;
  /** 所有已注册的子应用 */
  apps: Record<string, DevRegistryEntry>;
  /** 最后更新时间 */
  updatedAt: number;
}

/** Vite 插件配置 */
export interface GarfishSubAppOptions {
  /** 子应用名称（必须与 app-registry 中的 name 一致） */
  name: string;
  /**
   * 共享注册文件路径
   * @default 自动向上查找 monorepo 根目录下的 .dev-registry.json
   */
  registryFile?: string;
}
