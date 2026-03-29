.PHONY: help setup install proto proto-lint proto-breaking \
       dev-infra dev-infra-down dev-infra-logs \
       dev-backend build-backend test-backend \
       dev-frontend dev-frontend-main dev-frontend-feed \
       build-frontend build-preview preview kill-ports \
       fmt fmt-check lint typecheck check \
       dev dev-full build test test-e2e test-e2e-ui \
       clean clean-all \
       db-migrate db-migrate-down db-migrate-status db-migrate-fresh db-entity db-reset

# ============================================================
# Luhanxin Community Platform — 开发命令
# ============================================================

# 从 docker/.env 加载配置（唯一真相源），环境变量可覆盖
-include docker/.env
export

# 端口默认值（.env 未定义时使用）
GATEWAY_PORT     ?= 8000
SVC_USER_PORT    ?= 50051
CONSUL_HTTP_PORT ?= 8500
MAIN_PORT        ?= 5173
FEED_PORT        ?= 5174

help: ## 显示帮助信息
	@echo ""
	@echo "\033[1m🏗  Luhanxin Community Platform\033[0m"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ------------------------------------------------------------
# 初始化
# ------------------------------------------------------------

setup: ## 首次初始化：安装全局工具 + 项目依赖（新成员必跑）
	@echo ""
	@echo "\033[1m🔧 Setting up development environment...\033[0m"
	@echo ""
	@echo "── 检查全局工具 ──"
	@command -v rustc >/dev/null 2>&1 || (echo "❌ Rust not found. Install: https://rustup.rs" && exit 1)
	@command -v node >/dev/null 2>&1 || (echo "❌ Node.js not found. Install: https://nodejs.org" && exit 1)
	@command -v pnpm >/dev/null 2>&1 || (echo "❌ pnpm not found. Install: npm install -g pnpm" && exit 1)
	@command -v docker >/dev/null 2>&1 || (echo "❌ Docker not found. Install: https://docker.com" && exit 1)
	@command -v buf >/dev/null 2>&1 || (echo "⚠️  buf not found. Install: brew install bufbuild/buf/buf")
	@echo "── 安装 Rust CLI 工具 ──"
	@command -v sea-orm-cli >/dev/null 2>&1 && echo "  ✅ sea-orm-cli" || (echo "  📦 Installing sea-orm-cli..." && cargo install sea-orm-cli)
	@command -v cargo-watch >/dev/null 2>&1 && echo "  ✅ cargo-watch" || (echo "  📦 Installing cargo-watch..." && cargo install cargo-watch)
	@echo "── 安装项目依赖 ──"
	pnpm install
	@echo "── 初始化 Docker 环境 ──"
	@test -f docker/.env || cp docker/.env.example docker/.env
	@echo ""
	@echo "\033[1m✅ Setup complete! Next steps:\033[0m"
	@echo "  1. make dev-infra     — 启动 Docker 基础设施"
	@echo "  2. make db-migrate    — 运行数据库迁移"
	@echo "  3. make dev-backend   — 启动后端服务"
	@echo "  4. make dev-frontend  — 启动前端"
	@echo ""

install: ## 安装项目依赖 (pnpm install)
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
	@echo ""
	@echo "\033[1m🦀 Starting backend services...\033[0m"
	@echo ""
	@if command -v cargo-watch >/dev/null 2>&1; then \
		echo "  → Using cargo-watch (hot-reload enabled)"; \
		cd services && RUST_LOG=gateway=info,svc_user=info,shared=info cargo watch -q -x 'run --bin svc-user' 2>&1 | sed 's/^/  [svc-user] /' & \
		sleep 2; \
		cd services && RUST_LOG=gateway=info,svc_user=info,shared=info cargo watch -q -x 'run --bin gateway' 2>&1 | sed 's/^/  [gateway]  /' & \
	else \
		echo "  ⚠️  cargo-watch not installed, starting without hot-reload"; \
		echo "  💡 Install: cargo install cargo-watch"; \
		cd services && RUST_LOG=gateway=info,svc_user=info,shared=info cargo run --bin svc-user 2>&1 | sed 's/^/  [svc-user] /' & \
		sleep 2; \
		cd services && RUST_LOG=gateway=info,svc_user=info,shared=info cargo run --bin gateway 2>&1 | sed 's/^/  [gateway]  /' & \
	fi
	@sleep 5
	@echo ""
	@echo "\033[1m┌──────────────────────────────────────────────────┐\033[0m"
	@echo "\033[1m│  🦀 Backend Services Ready                       │\033[0m"
	@echo "\033[1m├──────────────────────────────────────────────────┤\033[0m"
	@echo "  Gateway:    \033[36mhttp://localhost:$(GATEWAY_PORT)\033[0m"
	@echo "  Swagger:    \033[36mhttp://localhost:$(GATEWAY_PORT)/swagger-ui/\033[0m"
	@echo "  Health:     \033[36mhttp://localhost:$(GATEWAY_PORT)/health\033[0m"
	@echo "  svc-user:   \033[36mlocalhost:$(SVC_USER_PORT)\033[0m (gRPC)"
	@echo "  Consul UI:  \033[36mhttp://localhost:$(CONSUL_HTTP_PORT)\033[0m"
	@echo "\033[1m└──────────────────────────────────────────────────┘\033[0m"
	@echo ""

build-backend: ## 构建后端 (release)
	cd services && cargo build --release

test-backend: ## 运行后端测试
	cd services && cargo test --all-targets

# ------------------------------------------------------------
# 前端
# ------------------------------------------------------------

dev-frontend: ## 启动前端所有子应用 (通过 dev.sh, 推荐)
	@echo ""
	@echo "\033[1m⚛️  Starting frontend apps...\033[0m"
	@echo ""
	@echo ""
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
# 数据库
# ------------------------------------------------------------

DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)

db-migrate: ## 运行数据库迁移 (向上)
	@echo "🗄  Running database migrations..."
	cd services && DATABASE_URL=$(DATABASE_URL) cargo run -p migration -- up
	@echo "✅ Migrations applied"

db-migrate-down: ## 回滚最近一次迁移
	@echo "🗄  Rolling back last migration..."
	cd services && DATABASE_URL=$(DATABASE_URL) cargo run -p migration -- down -n 1
	@echo "✅ Rolled back 1 migration"

db-migrate-status: ## 查看迁移状态
	cd services && DATABASE_URL=$(DATABASE_URL) cargo run -p migration -- status

db-migrate-fresh: ## 重建数据库 (drop all + re-migrate, 开发用)
	@echo "⚠️  Dropping all tables and re-running migrations..."
	cd services && DATABASE_URL=$(DATABASE_URL) cargo run -p migration -- fresh
	@echo "✅ Database freshly migrated"

db-entity: ## 从数据库生成 SeaORM Entity 代码
	@echo "🔧 Generating entities from database..."
	cd services && sea-orm-cli generate entity \
		-u $(DATABASE_URL) \
		-o shared/src/entity \
		--with-serde both
	@echo "✅ Entities generated"

db-reset: ## 重置数据库 (drop + create + migrate)
	@echo "⚠️  Resetting database..."
	@docker exec luhanxin-postgres psql -U luhanxin -c "DROP DATABASE IF EXISTS luhanxin_community;" 2>/dev/null || true
	@docker exec luhanxin-postgres psql -U luhanxin -c "CREATE DATABASE luhanxin_community;" 2>/dev/null || true
	@$(MAKE) db-migrate
	@echo "✅ Database reset complete"
