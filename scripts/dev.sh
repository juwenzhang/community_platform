#!/usr/bin/env bash
# =============================================================================
# dev.sh — 开发态一键启动脚本
#
# 流程：
# 1. 清理旧的 .dev-registry.json（避免残留的僵尸条目）
# 2. 并行启动所有 apps 下的 Vite dev server
#    - 每个子应用通过 garfishSubApp 插件自动注册真实端口到 .dev-registry.json
#    - main 通过 devRegistryMiddleware 暴露 /__dev_registry__ API
#    - main 的 DevConfigProvider 从该 API 拿到子应用真实地址
#
# 使用方式：
#   pnpm dev        — 启动所有应用
#   pnpm dev:main   — 只启动主应用
#   pnpm dev:feed   — 只启动 feed 子应用
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY_FILE="$ROOT_DIR/.dev-registry.json"

# 1. 清理旧的注册文件
if [ -f "$REGISTRY_FILE" ]; then
  echo "🧹 Cleaning stale dev registry..."
  rm -f "$REGISTRY_FILE"
fi

# 2. 创建空的注册文件
echo '{"version":1,"apps":{},"updatedAt":0}' > "$REGISTRY_FILE"

echo "🚀 Starting all dev servers..."
echo ""

# 3. 并行启动所有子应用（pnpm -r --parallel dev）
# 使用 exec 替换当前 shell，这样 Ctrl+C 能正确传递到子进程
exec pnpm -r --parallel dev
