#!/bin/bash

# GitHub AI Code Review 一键配置脚本
# 使用方法: bash scripts/setup-ai-review.sh

set -e

echo "🤖 GitHub AI 代码审查集成配置向导"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否有 gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ 未检测到 GitHub CLI (gh)${NC}"
    echo "请先安装: brew install gh"
    echo "然后运行: gh auth login"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登录 GitHub CLI${NC}"
    echo "请先运行: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI 已配置${NC}"
echo ""

# 获取仓库信息
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo -e "${RED}❌ 未检测到 GitHub 仓库${NC}"
    echo "请在项目根目录运行此脚本"
    exit 1
fi

echo -e "${GREEN}📦 当前仓库: $REPO${NC}"
echo ""

# 配置选择
echo "请选择要配置的功能:"
echo "1) CodeRabbit（PR 审查）"
echo "2) DeepSource（静态分析）"
echo "3) 自定义 GPT-4 分析（需要 OpenAI API Key）"
echo "4) 全部配置"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        setup_coderabbit
        ;;
    2)
        setup_deepsource
        ;;
    3)
        setup_openai
        ;;
    4)
        setup_coderabbit
        setup_deepsource
        setup_openai
        ;;
    *)
        echo -e "${RED}❌ 无效选项${NC}"
        exit 1
        ;;
esac

# CodeRabbit 配置
setup_coderabbit() {
    echo ""
    echo -e "${YELLOW}━━━ CodeRabbit 配置 ━━━${NC}"
    echo ""

    echo "步骤 1: 安装 CodeRabbit GitHub App"
    echo "访问: https://github.com/apps/coderabbitai"
    echo ""

    read -p "已安装 CodeRabbit? (y/n): " installed

    if [ "$installed" != "y" ]; then
        echo -e "${YELLOW}请先安装 CodeRabbit，然后重新运行此脚本${NC}"
        return
    fi

    echo -e "${GREEN}✅ CodeRabbit 配置完成${NC}"
}

# DeepSource 配置
setup_deepsource() {
    echo ""
    echo -e "${YELLOW}━━━ DeepSource 配置 ━━━${NC}"
    echo ""

    echo "步骤 1: 访问 DeepSource 并添加仓库"
    echo "https://deepsource.io/dashboard/"
    echo ""

    read -p "已添加仓库到 DeepSource? (y/n): " added

    if [ "$added" != "y" ]; then
        echo -e "${YELLOW}请先添加仓库，然后重新运行此脚本${NC}"
        return
    fi

    echo ""
    echo "步骤 2: 获取 DeepSource DSN"
    echo "在 DeepSource Dashboard → 项目设置中找到 DSN"
    echo ""

    read -p "请输入 DeepSource DSN: " dsn

    if [ -z "$dsn" ]; then
        echo -e "${RED}❌ DSN 不能为空${NC}"
        return
    fi

    # 设置 GitHub Secret
    echo ""
    echo "正在设置 GitHub Secret..."

    gh secret set DEEPSOURCE_DSN --body "$dsn" --repo "$REPO"

    echo -e "${GREEN}✅ DeepSource DSN 已设置${NC}"
    echo -e "${GREEN}✅ DeepSource 配置完成${NC}"
}

# OpenAI 配置
setup_openai() {
    echo ""
    echo -e "${YELLOW}━━━ OpenAI 配置 ━━━${NC}"
    echo ""

    echo "步骤 1: 获取 OpenAI API Key"
    echo "访问: https://platform.openai.com/api-keys"
    echo ""

    read -p "请输入 OpenAI API Key: " api_key

    if [ -z "$api_key" ]; then
        echo -e "${RED}❌ API Key 不能为空${NC}"
        return
    fi

    # 设置 GitHub Secret
    echo ""
    echo "正在设置 GitHub Secret..."

    gh secret set OPENAI_API_KEY --body "$api_key" --repo "$REPO"

    echo -e "${GREEN}✅ OpenAI API Key 已设置${NC}"
    echo -e "${GREEN}✅ OpenAI 配置完成${NC}"
}

# 最终确认
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 配置完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步:"
echo "1. 提交配置文件到 GitHub:"
echo "   git add .github/ .deepsource.toml"
echo "   git commit -m 'feat(ci): add AI code review integration'"
echo "   git push origin master"
echo ""
echo "2. 查看工作流运行状态:"
echo "   https://github.com/$REPO/actions"
echo ""
echo "3. 验证配置:"
echo "   创建一个测试 PR 或推送代码，查看 AI 分析结果"
echo ""
echo "📚 完整文档: docs/tech/10-github-ai-integration.md"
