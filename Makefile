.PHONY: proto dev-infra dev-backend dev-frontend dev build lint clean help \
       fmt fmt-check test test-e2e check

# ============================================================
# Luhanxin Community Platform — 开发命令
# ============================================================

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ------------------------------------------------------------
# Protobuf
# ------------------------------------------------------------

proto: ## 生成 Protobuf Rust + TypeScript 代码
	@echo "🔄 Generating Protobuf code..."
	cd proto && buf generate
	@echo "✅ Protobuf code generated"

proto-lint: ## 检查 Proto 文件规范
	cd proto && buf lint

proto-breaking: ## 检测 Proto 不兼容变更
	cd proto && buf breaking --against '.git#subdir=proto'

# ------------------------------------------------------------
# Docker 基础设施
# ------------------------------------------------------------

dev-infra: ## 启动 Docker 数据依赖 (PostgreSQL + Redis + Meilisearch)
	@echo "🐳 Starting infrastructure..."
	@test -f docker/.env || cp docker/.env.example docker/.env
	cd docker && docker compose up -d
	@echo "✅ Infrastructure started"

dev-infra-down: ## 停止 Docker 数据依赖
	cd docker && docker compose down

dev-infra-logs: ## 查看 Docker 容器日志
	cd docker && docker compose logs -f

# ------------------------------------------------------------
# 后端
# ------------------------------------------------------------

dev-backend: ## 启动后端服务 (Gateway + svc-user)
	@echo "🦀 Starting backend services..."
	cd services && cargo watch -x 'run --bin gateway' &
	cd services && cargo watch -x 'run --bin svc-user' &
	@echo "✅ Backend services starting..."

build-backend: ## 构建后端 (release)
	cd services && cargo build --release

test-backend: ## 运行后端测试
	cd services && cargo test --all-targets

# ------------------------------------------------------------
# 前端
# ------------------------------------------------------------

dev-frontend: ## 启动前端所有子应用
	@echo "⚛️  Starting frontend apps..."
	pnpm --filter '@luhanxin/*' dev

build-frontend: ## 构建前端
	pnpm --filter '@luhanxin/*' build

test-e2e: ## 运行 Playwright E2E 测试
	pnpm test:e2e

test-e2e-ui: ## 打开 Playwright UI 模式
	pnpm test:e2e:ui

# ------------------------------------------------------------
# 代码质量
# ------------------------------------------------------------

fmt: ## 格式化所有代码 (Rust + TypeScript)
	cd services && cargo fmt --all
	pnpm format

fmt-check: ## 检查格式化 (CI 用)
	cd services && cargo fmt --all -- --check
	pnpm format:check

lint: proto-lint ## 运行所有 lint 检查
	@echo "🔍 Running lints..."
	cd services && cargo clippy --all-targets --all-features -- -D warnings
	pnpm lint
	@echo "✅ All lints passed"

typecheck: ## TypeScript 类型检查
	pnpm typecheck

check: fmt-check lint typecheck ## 完整检查 (CI 流水线)
	@echo "✅ All checks passed"

# ------------------------------------------------------------
# 全局命令
# ------------------------------------------------------------

dev: dev-infra ## 一键启动全部 (基础设施 + 后端 + 前端)
	@sleep 3
	@$(MAKE) dev-backend
	@sleep 2
	@$(MAKE) dev-frontend

build: build-backend build-frontend ## 构建全部

test: test-backend test-e2e ## 运行所有测试

clean: ## 清理构建产物
	@echo "🧹 Cleaning..."
	cd services && cargo clean
	rm -rf apps/*/dist packages/*/dist
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	@echo "✅ Clean complete"

# ------------------------------------------------------------
# 数据库 (预留)
# ------------------------------------------------------------

db-migrate: ## 运行数据库迁移 (TODO)
	@echo "⚠️  Database migration not yet implemented"

db-reset: ## 重置数据库 (TODO)
	@echo "⚠️  Database reset not yet implemented"
