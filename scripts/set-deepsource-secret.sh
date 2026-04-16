#!/bin/bash

# 设置 DeepSource DSN 到 GitHub Secrets
# 使用方法: bash scripts/set-deepsource-secret.sh

set -e

# DeepSource DSN
DEEPSOURCE_DSN="https://221d0c7b7db14d0090655b0166b41e0c@app.deepsource.com"
REPO="juwenzhang/community_platform"

echo "🔐 设置 DeepSource DSN 到 GitHub Secrets"
echo ""

# 检查是否有 gh CLI
if command -v gh &> /dev/null; then
    echo "✅ 检测到 GitHub CLI"
    echo "正在设置..."

    gh secret set DEEPSOURCE_DSN --body "$DEEPSOURCE_DSN" --repo "$REPO"

    echo ""
    echo "✅ DeepSource DSN 已设置成功！"
    echo ""
    echo "验证设置："
    gh secret list --repo "$REPO" | grep DEEPSOURCE_DSN && echo "  ✅ 已确认" || echo "  ❌ 未找到"

else
    echo "❌ 未检测到 GitHub CLI (gh)"
    echo ""
    echo "请手动设置 GitHub Secret："
    echo ""
    echo "步骤："
    echo "1. 访问: https://github.com/$REPO/settings/secrets/actions"
    echo "2. 点击 'New repository secret'"
    echo "3. 填写："
    echo "   Name: DEEPSOURCE_DSN"
    echo "   Value: $DEEPSOURCE_DSN"
    echo "4. 点击 'Add secret'"
    echo ""
    echo "或者安装 GitHub CLI："
    echo "  brew install gh"
    echo "  gh auth login"
    echo "  bash scripts/set-deepsource-secret.sh"
fi
