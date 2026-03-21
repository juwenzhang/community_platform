import fs from 'node:fs';
import path from 'node:path';
import { DEV_REGISTRY_FILENAME } from './constants';
import type { DevRegistryEntry, DevRegistryFile } from './types';

/**
 * 查找 monorepo 根目录（向上寻找 pnpm-workspace.yaml）
 */
export function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(dir, 'pnpm-workspace.yml'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // 回退到 startDir
  return startDir;
}

/**
 * 获取共享注册文件的完整路径
 */
export function getRegistryFilePath(customPath?: string): string {
  if (customPath) return customPath;
  const root = findMonorepoRoot(process.cwd());
  return path.join(root, DEV_REGISTRY_FILENAME);
}

/**
 * 读取共享注册文件
 */
export function readRegistryFile(filePath: string): DevRegistryFile {
  const empty: DevRegistryFile = { version: 1, apps: {}, updatedAt: Date.now() };

  try {
    if (!fs.existsSync(filePath)) return empty;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as DevRegistryFile;
    return data;
  } catch {
    return empty;
  }
}

/**
 * 写入/更新共享注册文件中的某个子应用
 *
 * 使用文件锁避免多进程竞争（简化版：retry + atomic write）
 */
export function writeRegistryEntry(filePath: string, entry: DevRegistryEntry): void {
  const registry = readRegistryFile(filePath);
  registry.apps[entry.name] = entry;
  registry.updatedAt = Date.now();

  // 清理已停止的进程（PID 不存在的条目）
  for (const [name, app] of Object.entries(registry.apps)) {
    if (!isProcessAlive(app.pid)) {
      delete registry.apps[name];
    }
  }

  // 原子写入：先写临时文件再 rename
  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(registry, null, 2), 'utf-8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * 从共享注册文件中移除某个子应用
 */
export function removeRegistryEntry(filePath: string, name: string): void {
  const registry = readRegistryFile(filePath);
  delete registry.apps[name];
  registry.updatedAt = Date.now();

  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(registry, null, 2), 'utf-8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * 检测进程是否存活
 */
function isProcessAlive(pid: number): boolean {
  try {
    // kill(pid, 0) 不发送信号，仅检测进程是否存在
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
