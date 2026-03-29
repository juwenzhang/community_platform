#!/usr/bin/env bash
# =============================================================================
# dev.sh — 开发态一键启动脚本
#
# 流程：
# 1. 清理残留进程 + .dev-registry.json
# 2. 并行启动所有 apps 下的 Vite dev server
#    - 每个子应用通过 garfishSubApp 插件自动注册真实端口到 .dev-registry.json
#    - main 通过 devRegistryMiddleware 暴露 /__dev_registry__ API
#    - main 的 DevConfigProvider 从该 API 拿到子应用真实地址
# 3. 等待 .dev-registry.json 中所有子应用就绪，打印地址汇总
#
# 使用方式：
#   pnpm dev        — 启动所有应用
#   pnpm dev:main   — 只启动主应用
#   pnpm dev:feed   — 只启动 feed 子应用
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY_FILE="$ROOT_DIR/.dev-registry.json"

# 颜色定义
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

# 需要等待的子应用名称（不含 main，main 不会注册到 registry）
SUB_APPS=("feed" "user-profile")
# 预期就绪的子应用数量
EXPECTED_COUNT=${#SUB_APPS[@]}

# 1. 清理旧的注册文件
if [ -f "$REGISTRY_FILE" ]; then
  echo "🧹 Cleaning stale dev registry..."
  rm -f "$REGISTRY_FILE"
fi

# 创建空的注册文件
echo '{"version":1,"apps":{},"updatedAt":0}' > "$REGISTRY_FILE"

echo "🚀 Starting all dev servers..."
echo ""

# 2. 后台启动所有子应用
DEV_PID=""

cleanup() {
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

FORCE_COLOR=1 pnpm -r --parallel --color dev &
DEV_PID=$!

# 3. 等待子应用注册到 .dev-registry.json（单一数据源，不解析日志）
#
#    garfishSubApp 插件在 Vite httpServer.listening 事件触发后，
#    将 { name, url, port } 写入 .dev-registry.json。
#    我们只需要检查 JSON 中注册的子应用数量 >= EXPECTED_COUNT。
TIMEOUT=90
ELAPSED=0

while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))

  # 统计 .dev-registry.json 中已注册的子应用数量
  # jq 可能不存在，用 python3（macOS 自带）解析 JSON
  REGISTERED=$(python3 -c "
import json, sys
try:
    with open('$REGISTRY_FILE') as f:
        d = json.load(f)
    print(len(d.get('apps', {})))
except:
    print(0)
" 2>/dev/null)

  if [ "$REGISTERED" -ge "$EXPECTED_COUNT" ] 2>/dev/null; then
    break
  fi
done

# 4. 从 .dev-registry.json 读取真实地址（Single Source of Truth）
#    main 不在 registry 中（它是主应用），需要单独获取
read_urls() {
  python3 -c "
import json
try:
    with open('$REGISTRY_FILE') as f:
        d = json.load(f)
    apps = d.get('apps', {})

    # 子应用从 registry 读
    feed = apps.get('feed', {})
    profile = apps.get('user-profile', {})
    feed_url = feed.get('url', 'http://localhost:5174')
    profile_url = profile.get('url', 'http://localhost:5175')

    # main 不在 registry 中，从 feed 端口推断（main 先启动，端口通常最小）
    # 但更可靠的方式：检测 main 的实际端口
    # main 监听的端口 = 检测 5173 开始哪个端口有 HTTP 响应
    print(f'{feed_url}|{profile_url}')
except Exception as e:
    print('http://localhost:5174|http://localhost:5175')
"
}

URLS=$(read_urls)
FEED_URL=$(echo "$URLS" | cut -d'|' -f1)
PROFILE_URL=$(echo "$URLS" | cut -d'|' -f2)

# main 端口：尝试从进程列表中找到
# pnpm 启动的 vite 进程参数中包含 --port 5173，但实际监听的可能不同
# 最可靠的方式：用 lsof 找 node 进程监听的端口，匹配 main 的 vite
MAIN_PORT=""
for port in 5173 5174 5175 5176 5177 5178 5179 5180; do
  # 检查这个端口是否在 feed/user-profile 中（已知），如果不是就是 main
  if [ "http://localhost:${port}" != "${FEED_URL%/}" ] && [ "http://localhost:${port}" != "${PROFILE_URL%/}" ]; then
    # 检查端口是否有进程监听
    if lsof -iTCP:"$port" -sTCP:LISTEN -P >/dev/null 2>&1; then
      MAIN_PORT=$port
      break
    fi
  fi
done
MAIN_URL="http://localhost:${MAIN_PORT:-5173}/"

# 5. 打印地址汇总
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ⚛️  All Frontend Dev Servers Ready!                  ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Main App:      ${BOLD}${CYAN}${MAIN_URL}${RESET}$(printf '%*s' $((24 - ${#MAIN_URL})) '')${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Feed App:      ${BOLD}${CYAN}${FEED_URL}${RESET}$(printf '%*s' $((24 - ${#FEED_URL})) '')${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  User Profile:  ${BOLD}${CYAN}${PROFILE_URL}${RESET}$(printf '%*s' $((24 - ${#PROFILE_URL})) '')${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
  echo -e "${BOLD}${YELLOW}⚠️  Timeout waiting for sub-apps. Some may still be starting...${RESET}"
fi

# 6. 等待子进程（Ctrl+C 由 trap 处理）
wait $DEV_PID || true
