<p align="center">
  <h1 align="center">🏗️ Luhanxin Community Platform</h1>
  <p align="center">
    A developer-focused programming community platform — Full-stack architecture with Rust microservices + React/Vue micro-frontend
  </p>
  <p align="center">
    English | <a href="./README.md">中文</a>
  </p>
  <p align="center">
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-project-structure">Project Structure</a> •
    <a href="#-development-commands">Commands</a> •
    <a href="#-environment-variables">Env Vars</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</p>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Micro-frontend** | [Garfish](https://www.garfish.dev/) (host/sub-app architecture) |
| **Frontend** | React 18 (core apps) / Vue 3 (user profile sub-app) |
| **Build Tools** | Vite 6 + pnpm 9 Monorepo |
| **State Management** | Zustand (React) / Pinia (Vue) |
| **API Client** | [@connectrpc/connect-web](https://connectrpc.com/) + protobuf-es (HTTP/2 + Protobuf) |
| **Styling** | Tailwind CSS + CSS Modules (Less) + Ant Design 5.x |
| **Code Quality** | [Biome](https://biomejs.dev/) (format + lint) + commitlint + husky |
| **Backend** | Rust (edition 2024, stable) |
| **HTTP Gateway** | [Axum](https://github.com/tokio-rs/axum) 0.8 |
| **Microservice RPC** | [Tonic](https://github.com/hyperium/tonic) 0.14 (gRPC) + prost (Protobuf) |
| **ORM** | [SeaORM](https://www.sea-ql.org/SeaORM/) + PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Search** | [Meilisearch](https://www.meilisearch.com/) |
| **Service Discovery** | [Consul](https://www.consul.io/) |
| **Message Queue** | [NATS](https://nats.io/) |
| **API Docs** | [utoipa](https://github.com/juhaku/utoipa) + Swagger UI |
| **Unit Testing** | [Vitest](https://vitest.dev/) (frontend) + cargo test (backend) |
| **E2E Testing** | [Playwright](https://playwright.dev/) (Chromium / Firefox / WebKit) |
| **Infrastructure** | Docker Compose (dev) → K8s (prod) |

## Prerequisites

| Tool | Min Version | Install | Purpose |
|------|------------|---------|---------|
| **Rust** | stable | [rustup.rs](https://rustup.rs) | Backend compilation |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org) | Frontend runtime |
| **pnpm** | 9+ | `npm install -g pnpm` | Package manager |
| **Docker** | 24+ | [docker.com](https://docker.com) | Infrastructure containers |
| **buf** | 1.x | `brew install bufbuild/buf/buf` | Protobuf toolchain |
| protoc-gen-prost | latest | `cargo install protoc-gen-prost` | Rust Protobuf codegen |
| protoc-gen-tonic | latest | `cargo install protoc-gen-tonic` | Rust gRPC codegen |

**Recommended (optional)**:

```bash
cargo install cargo-watch     # Rust hot-reload
cargo install sea-orm-cli     # DB migration + entity generation
brew install grpcurl           # gRPC CLI debugging
```

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd community_platform

# 2. Initialize (check tools + install deps + copy .env)
make setup

# 3. Start infrastructure (PostgreSQL + Redis + Meilisearch + Consul + NATS)
make dev-infra

# 4. Generate Protobuf code (Rust + TypeScript)
make proto

# 5. Run database migrations
make db-migrate

# 6. Start full stack (backend + frontend)
make dev-full
```

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| Main App | http://localhost:5173 | React + Garfish host |
| Feed Sub-app | http://localhost:5174 | React sub-app |
| User Profile Sub-app | http://localhost:5175 | Vue 3 sub-app |
| Gateway API | http://localhost:8000 | HTTP/2 + Connect RPC |
| Swagger UI | http://localhost:8000/swagger-ui/ | API documentation |
| Consul UI | http://localhost:8500 | Service discovery console |
| Meilisearch | http://localhost:7700 | Search engine dashboard |

> **Daily frontend work?** Just run `make dev` (auto-cleans registry + starts all sub-apps in parallel).

## Project Structure

```
community_platform/
├── apps/                        # Frontend sub-applications (Garfish micro-frontend)
│   ├── main/                    #   Main host app (React 18, :5173)
│   ├── feed/                    #   Feed sub-app (React 18, :5174)
│   └── user-profile/            #   User profile sub-app (Vue 3, :5175)
│
├── packages/                    # Shared frontend packages
│   ├── shared-types/            #   Protobuf-generated TypeScript types
│   ├── app-registry/            #   Micro-frontend service discovery registry
│   └── dev-kit/                 #   Vite plugins + dev tooling (tsup build)
│
├── services/                    # Rust backend microservices (Cargo workspace)
│   ├── gateway/                 #   HTTP Gateway (Axum, :8000)
│   ├── svc-user/                #   User service (Tonic gRPC, :50051)
│   ├── svc-content/             #   Content service (Tonic gRPC, :50052)
│   ├── shared/                  #   Shared library (proto, config, auth, discovery)
│   └── migration/               #   Database migrations (SeaORM)
│
├── proto/                       # Protobuf definitions (single source of truth)
│   └── luhanxin/community/v1/   #   Business proto files
│
├── docker/                      # Docker Compose dev environment
├── scripts/                     # Automation scripts
├── docs/                        # Documentation
├── openspec/                    # OpenSpec workflow (docs-first development)
├── tests/                       # Frontend unit tests (Vitest)
├── e2e/                         # E2E tests (Playwright)
└── Makefile                     # Dev command hub (run `make help`)
```

## Port Allocation

| Port | Service | Protocol |
|------|---------|----------|
| 5173 | Main App (React) | HTTP |
| 5174 | Feed App (React) | HTTP |
| 5175 | User Profile App (Vue) | HTTP |
| 4173 | Preview Server | HTTP |
| 8000 | Gateway | HTTP/2 (Connect RPC) |
| 50051 | svc-user | gRPC |
| 50052 | svc-content | gRPC |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 7700 | Meilisearch | HTTP |
| 8500 | Consul | HTTP |
| 4222 | NATS | TCP |

## Development Commands

All common operations are integrated into the `Makefile`. Run `make help` for the full list.

| Command | Description |
|---------|-------------|
| `make setup` | First-time init (check tools + install deps + copy .env) |
| `make dev` | Start all frontend sub-apps (daily use) |
| `make dev-full` | Full stack (infra + backend + frontend) |
| `make dev-backend` | Start backend services (hot-reload with cargo-watch) |
| `make proto` | Generate Protobuf code (Rust + TypeScript) |
| `make db-migrate` | Run database migrations |
| `make db-reset` | Reset database (drop + create + migrate) |
| `make build` | Build everything (backend release + frontend) |
| `make test` | Run all tests (unit + E2E) |
| `make check` | Full CI check (format + lint + typecheck) |
| `make fmt` | Format all code (Rust + TypeScript) |
| `make lint` | Run all linters (Clippy + Biome + Proto) |
| `make kill-ports` | Kill processes on project ports |
| `make clean` | Clean build artifacts |

## Environment Variables

### Backend (`docker/.env`)

Copy from `docker/.env.example`. `make setup` does this automatically.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://luhanxin:...@localhost:5432/...` | PostgreSQL connection (**required**) |
| `REDIS_URL` | `redis://:redis_dev_2024@localhost:6379` | Redis connection |
| `MEILI_URL` | `http://localhost:7700` | Meilisearch URL |
| `JWT_SECRET` | `dev_jwt_secret_...` | JWT signing secret (**required**) |
| `JWT_EXPIRY_HOURS` | `168` | Token expiry (hours) |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name (image upload) |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |

### Frontend (`apps/main/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_GIPHY_API_KEY` | GIPHY API Key (GIF/Sticker picker) |

> Both `.env` and `.env.local` are gitignored and will not be committed.

## Protocol Choices

| Scenario | Protocol | Data Format |
|----------|----------|-------------|
| Frontend API calls | HTTP/2 (Connect) | Protobuf |
| Inter-service calls | gRPC (Tonic) | Protobuf |
| Async events | NATS | Protobuf |
| Real-time notifications | WebSocket | Protobuf |
| AI streaming | SSE | JSON |
| File uploads | HTTP/2 | multipart |
| Service discovery | Consul HTTP API | JSON |

> **Core principle**: All frontend-backend API interactions use Protobuf, not JSON. Proto files are the single source of truth.

## Contributing

### Commit Convention

```
<type>(<scope>): <subject>
```

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `ci`
- **scope**: `main` | `feed` | `user-profile` | `shared-types` | `gateway` | `svc-user` | `svc-content` | `proto` | `infra` | `docs`

### Branch Naming

```
<type>/short-description
```

Examples: `feat/dark-mode`, `fix/avatar-upload`, `docs/readme-update`

### PR Workflow

1. **Feature / architecture changes**: Complete OpenSpec docs first (proposal → design → tasks), then submit code PR
2. **Bug fixes / typos**: Submit PR directly
3. All PRs must pass `make check`

## Documentation

| Directory | Description |
|-----------|-------------|
| [`docs/design/`](docs/design/) | Architecture design documents (date-organized) |
| [`docs/tech/`](docs/tech/) | Technology research & selection |
| [`services/README.md`](services/README.md) | Backend service development guide |
| [`openspec/`](openspec/) | OpenSpec workflow documentation |

## License

[MIT](LICENSE)
