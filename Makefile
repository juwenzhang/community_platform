.PHONY: help install proto proto-lint proto-breaking \
       dev-infra dev-infra-down dev-infra-logs \
       dev-backend build-backend test-backend \
       dev-frontend dev-frontend-main dev-frontend-feed \
       build-frontend build-preview preview kill-ports \
       fmt fmt-check lint typecheck check \
       dev dev-full build test test-e2e test-e2e-ui \
       clean clean-all \
       db-migrate db-reset

# ============================================================
# Luhanxin Community Platform — 开发命令
# ============================================================

help: ## 显示帮助信息
	@echo ""
	@echo "\033[1m🏗  Luhanxin Community Platform\033[0m"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ------------------------------------------------------------
# 初始化
# ------------------------------------------------------------

install: ## 安装所有依赖 (pnpm install)
	pnpm install

# ------------------------------------------------------------
# Protobuf
# ------------------------------------------------------------

proto: ## 生成 Protobuf Rust + TypeScript 代码
	@echo "🔄 Generating Protobuf code..."
	cd proto && buf generate
	@echo "🔧 Generating Rust proto mod.rs..."
	@bash scripts/gen-proto-mod.sh
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

dev-backend: ## 启动后端服务 (Gateway + svc-user, 有 cargo-watch 则热重载)
	@echo "🦀 Starting backend services..."
	@if command -v cargo-watch >/dev/null 2>&1; then \
		echo "  → Using cargo-watch (hot-reload enabled)"; \
		cd services && cargo watch -x 'run --bin gateway' & \
		cd services && cargo watch -x 'run --bin svc-user' & \
	else \
		echo "  ⚠️  cargo-watch not installed, starting without hot-reload"; \
		echo "  💡 Install: cargo install cargo-watch"; \
		cd services && cargo run --bin gateway & \
		cd services && cargo run --bin svc-user & \
	fi
	@echo "✅ Backend services starting..."

build-backend: ## 构建后端 (release)
	cd services && cargo build --release

test-backend: ## 运行后端测试
	cd services && cargo test --all-targets

# ------------------------------------------------------------
# 前端
# ------------------------------------------------------------

dev-frontend: ## 启动前端所有子应用 (通过 dev.sh, 推荐)
	@echo "⚛️  Starting frontend apps..."
	@bash scripts/dev.sh

dev-frontend-main: ## 只启动主应用 (main)
	pnpm dev:main

dev-frontend-feed: ## 只启动 feed 子应用
	pnpm dev:feed

build-frontend: ## 构建前端所有包和应用
	pnpm -r build

build-preview: ## 构建前端并组装 preview 目录 (子应用 → main/dist/apps/)
	@bash scripts/build-preview.sh

preview: build-preview ## 构建并启动 preview server (验证生产效果)
	@echo "🌐 Starting preview server on http://localhost:4173 ..."
	pnpm --filter @luhanxin/main preview

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

dev: ## 一键启动前端 (清理注册表 + 并行启动所有子应用, 日常推荐)
	@bash scripts/dev.sh

dev-full: dev-infra ## 一键启动全栈 (基础设施 + 后端 + 前端)
	@sleep 3
	@$(MAKE) dev-backend
	@sleep 2
	@$(MAKE) dev-frontend

build: build-backend build-frontend ## 构建全部 (后端 + 前端)

test: test-backend ## 运行所有测试 (单元 + E2E)
	pnpm test
	@$(MAKE) test-e2e

kill-ports: ## 杀掉项目占用的端口进程 (8000,50051,5173,5174,4173)
	@echo "🔪 Killing processes on project ports..."
	@for port in 8000 50051 5173 5174 4173; do \
		pid=$$(lsof -ti:$$port 2>/dev/null); \
		if [ -n "$$pid" ]; then \
			echo "  → port $$port: killing PID $$pid"; \
			kill $$pid 2>/dev/null; \
		else \
			echo "  → port $$port: 空闲"; \
		fi; \
	done
	@echo "✅ Ports cleared"

clean: ## 清理构建产物 (保留 node_modules)
	@echo "🧹 Cleaning build artifacts..."
	cd services && cargo clean
	rm -rf apps/*/dist packages/*/dist
	rm -f .dev-registry.json
	@echo "✅ Clean complete"

clean-all: clean ## 深度清理 (含 node_modules + 杀端口进程, 需要重新 install)
	@echo "🧹 Killing processes on project ports (8000,50051,5173,5174,4173)..."
	@-lsof -ti:8000,50051,5173,5174,4173 2>/dev/null | xargs kill 2>/dev/null; true
	@echo "🧹 Deep cleaning..."
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	@echo "✅ Deep clean complete. Run 'make install' to reinstall."

# ------------------------------------------------------------
# 数据库 (预留)
# ------------------------------------------------------------

db-migrate: ## 运行数据库迁移 (TODO)
	@echo "⚠️  Database migration not yet implemented"

db-reset: ## 重置数据库 (TODO)
	@echo "⚠️  Database reset not yet implemented"
