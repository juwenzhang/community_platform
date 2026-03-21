import type { HealthCheckOptions, RegistryOptions } from './types';

/** 默认健康检查配置 */
export const DEFAULT_HEALTH_CHECK_OPTIONS: HealthCheckOptions = {
  enabled: true,
  interval: 30_000, // 30秒
  timeout: 3_000, // 3秒超时
  unhealthyThreshold: 3, // 连续 3 次失败标记为 unhealthy
};

/** 默认注册表配置（需要传入 provider） */
export const DEFAULT_REGISTRY_OPTIONS: Omit<Required<RegistryOptions>, 'provider'> = {
  healthCheck: DEFAULT_HEALTH_CHECK_OPTIONS,
};
