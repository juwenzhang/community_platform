#!/usr/bin/env bash
# =============================================================================
# build-preview.sh — 构建所有应用并组装 preview 目录
#
# 流程：
# 1. 构建所有 packages（shared-types, app-registry, dev-kit 等）
# 2. 构建所有 apps（main + 子应用）
# 3. 将子应用的 dist/ 拷贝到 main/dist/apps/<name>/ 下
#    这样 vite preview 的静态文件服务能直接 serve 子应用资源
#    主应用中 envEntries.production = '/apps/feed/' 就能正确解析
#
# 使用方式：
#   pnpm run build:preview   — 构建并组装
#   pnpm run preview         — 构建并启动 preview server
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MAIN_DIST="$ROOT_DIR/apps/main/dist"

echo "🔨 Building all packages and apps..."
echo ""

# 1. 构建所有包和应用
pnpm -r build

echo ""
echo "📦 Assembling preview directory..."
echo ""

# 2. 确保 main/dist/apps/ 目录存在
mkdir -p "$MAIN_DIST/apps"

# 3. 将每个子应用的 dist 拷贝到 main/dist/apps/<name>/
# 遍历 apps/ 目录下的所有子应用（排除 main）
for app_dir in "$ROOT_DIR"/apps/*/; do
  app_name=$(basename "$app_dir")

  # 跳过主应用
  if [ "$app_name" = "main" ]; then
    continue
  fi

  app_dist="$app_dir/dist"

  if [ -d "$app_dist" ]; then
    target="$MAIN_DIST/apps/$app_name"
    echo "  📋 Copying $app_name/dist → main/dist/apps/$app_name/"
    rm -rf "$target"
    cp -r "$app_dist" "$target"
  else
    echo "  ⚠️  $app_name has no dist/ directory, skipping"
  fi
done

echo ""
echo "✅ Preview build complete!"
echo ""
echo "Directory structure:"
echo "  apps/main/dist/"
echo "  ├── index.html          (主应用)"
echo "  ├── assets/              (主应用静态资源)"
echo "  └── apps/"

# 列出组装的子应用
for app_dir in "$MAIN_DIST"/apps/*/; do
  if [ -d "$app_dir" ]; then
    app_name=$(basename "$app_dir")
    echo "      └── $app_name/       (子应用)"
  fi
done

echo ""
echo "Run 'pnpm run preview' to start the preview server."
