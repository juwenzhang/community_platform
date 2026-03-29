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
# 3. 等待 Vite 就绪，打印醒目的访问地址汇总
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

# 颜色定义
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
RESET="\033[0m"

# 1. 清理旧的注册文件
if [ -f "$REGISTRY_FILE" ]; then
  echo "🧹 Cleaning stale dev registry..."
  rm -f "$REGISTRY_FILE"
fi

# 2. 创建空的注册文件
echo '{"version":1,"apps":{},"updatedAt":0}' > "$REGISTRY_FILE"

echo "🚀 Starting all dev servers..."
echo ""

# 3. 后台启动所有子应用，将输出写入临时文件以便检测就绪状态
LOG_FILE=$(mktemp /tmp/dev-servers.XXXXXX.log)
pnpm -r --parallel dev > >(tee "$LOG_FILE") 2>&1 &
DEV_PID=$!

# 4. 等待 Vite 就绪（检测 "ready in" 出现 2 次 = main + feed）
READY_COUNT=0
TIMEOUT=60
ELAPSED=0
while [ $READY_COUNT -lt 2 ] && [ $ELAPSED -lt $TIMEOUT ]; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  READY_COUNT=$(grep -c "ready in" "$LOG_FILE" 2>/dev/null || echo 0)
done

# 5. 从日志中提取实际端口
MAIN_URL=$(grep -o "http://localhost:[0-9]*/" "$LOG_FILE" | head -1 || echo "http://localhost:5173/")
FEED_URL=$(grep -o "http://localhost:[0-9]*/" "$LOG_FILE" | tail -1 || echo "http://localhost:5174/")

# 6. 打印醒目的地址汇总
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ⚛️  All Frontend Dev Servers Ready!              ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                  ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Main App:  ${BOLD}${CYAN}${MAIN_URL}${RESET}                   ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Feed App:  ${BOLD}${CYAN}${FEED_URL}${RESET}                   ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                  ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# 7. 清理临时文件，等待子进程（Ctrl+C 传递给 pnpm）
rm -f "$LOG_FILE"

# 捕获信号，确保子进程也被终止
trap 'kill $DEV_PID 2>/dev/null; exit 0' INT TERM
wait $DEV_PID
