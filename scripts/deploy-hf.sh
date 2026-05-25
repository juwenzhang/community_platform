#!/usr/bin/env bash
# ============================================================
# deploy-hf.sh — 推送后端代码到 HuggingFace Space
#
# 用法：
#   HF_TOKEN=hf_xxxx bash scripts/deploy-hf.sh
#   或设置环境变量后直接运行
#
# 只推送后端必要文件（~1MB），不包含前端/target/node_modules
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# HF Space 配置
HF_SPACE="luhanxin/comunity-platform-backend"
HF_BRANCH="main"

# 检查 token
if [ -z "${HF_TOKEN:-}" ]; then
    echo "❌ HF_TOKEN 环境变量未设置"
    echo "   获取: https://huggingface.co/settings/tokens"
    echo "   用法: HF_TOKEN=hf_xxxx bash scripts/deploy-hf.sh"
    exit 1
fi

echo "🚀 Deploying backend to HuggingFace Space: $HF_SPACE"
echo ""

# 创建临时目录
DEPLOY_DIR=$(mktemp -d)
trap "rm -rf $DEPLOY_DIR" EXIT

echo "📦 Copying backend files..."

# 复制必要文件
cp "$ROOT_DIR/Cargo.toml" "$DEPLOY_DIR/"
cp "$ROOT_DIR/Cargo.lock" "$DEPLOY_DIR/"
cp "$ROOT_DIR/rust-toolchain.toml" "$DEPLOY_DIR/"
cp "$ROOT_DIR/Dockerfile" "$DEPLOY_DIR/"

# HF Space 的 README.md 必须在根目录（包含 sdk: docker 元数据）
cp "$ROOT_DIR/infra/huggingface/README.md" "$DEPLOY_DIR/README.md"

# 复制目录（排除 target）
cp -r "$ROOT_DIR/crates" "$DEPLOY_DIR/"
rsync -a --exclude='target' "$ROOT_DIR/services/" "$DEPLOY_DIR/services/"
cp -r "$ROOT_DIR/infra" "$DEPLOY_DIR/"
cp -r "$ROOT_DIR/scripts" "$DEPLOY_DIR/"

echo "  ✅ Files copied ($(du -sh "$DEPLOY_DIR" | cut -f1))"
echo ""

# Git 初始化并推送
cd "$DEPLOY_DIR"
git init -q -b main
# CI/临时仓库必须设置提交身份；HF_TOKEN 只负责认证，不能替代 git author
git config user.email "ci@luhanxin.com"
git config user.name "Luhanxin Deploy Bot"
git add .
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"

echo "📡 Pushing to HuggingFace Space..."
git push --force "https://luhanxin:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE}" HEAD:${HF_BRANCH}

echo ""
echo "✅ Deployed successfully!"
echo ""
echo "  Space:   https://huggingface.co/spaces/${HF_SPACE}"
echo "  API:     https://luhanxin-comunity-platform-backend.hf.space/swagger-ui/"
echo "  Health:  https://luhanxin-comunity-platform-backend.hf.space/health"
echo ""
echo "  ⏳ 构建约需 15-30 分钟（Rust 编译），请在 Space 页面查看 Build logs"
