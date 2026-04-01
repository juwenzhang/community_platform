# Luhanxin Community Platform — Codebase Handbook

> 📅 Last Updated: April 1, 2026
> 🏗️ Architecture: Rust Backend (Microservices) + React Frontend (Micro-frontend)
> 📦 Monorepo: pnpm workspace

---

## 1. Monorepo Structure

### 1.1 Top-Level Directory Map

```
community_platform/
├── apps/                    # Frontend sub-applications (Garfish micro-frontend)
│   ├── main/                # Main host application (React + Garfish, port 5173)
│   ├── feed/                # Feed sub-application (React, port 5174)
│   └── user-profile/        # User profile sub-application (React, port 5175)
├── packages/                # Shared frontend packages
│   ├── shared-types/        # Protobuf-generated TypeScript types
│   ├── app-registry/        # Sub-app service discovery registry (Garfish)
│   └── dev-kit/             # Vite plugins + dev tooling (tsup build)
├── services/                # Rust backend microservices (Cargo workspace)
│   ├── gateway/             # HTTP Gateway (Axum, port 8000)
│   ├── svc-user/            # User service (Tonic gRPC, port 50051)
│   ├── svc-content/         # Content service (Tonic gRPC, port 50052)
│   ├── shared/              # Shared Rust library (proto, auth, db, discovery)
│   └── migration/           # SeaORM database migrations
├── proto/                   # Protobuf definitions (single source of truth)
│   └── luhanxin/community/v1/  # Business proto files
│       ├── common.proto     # Common types (pagination, timestamp helpers)
│       ├── user.proto       # User service messages & RPC
│       ├── article.proto    # Article/content service messages & RPC
│       └── event.proto      # Event definitions for async messaging
├── docker/                  # Docker Compose configuration
│   ├── docker-compose.yml   # PostgreSQL, Redis, Meilisearch, Consul, NATS
│   └── .env.example         # Environment variables template
├── scripts/                 # Development automation scripts
│   ├── dev.sh               # Dev server orchestration (manages .dev-registry.json)
│   ├── build-preview.sh     # Sub-app bundle assembly for preview
│   └── gen-proto-mod.sh     # Rust proto mod.rs generation (auto-run after buf generate)
├── docs/                    # Documentation
│   ├── design/YYYY-MM-DD/   # Architecture decisions (date-organized)
│   └── tech/                # Technology research & selection (01-xx.md)
├── openspec/                # OpenSpec workflow (pre-code design)
│   ├── config.yaml          # Project context & rules
│   ├── specs/               # Main specification documents
│   └── changes/             # Change proposals (delta specs before merge)
├── tests/                   # Frontend unit tests (vitest)
├── e2e/                     # End-to-end tests (Playwright)
├── Makefile                 # Development command integration
├── biome.json               # Frontend code quality (format + lint)
├── tsconfig.base.json       # Base TypeScript config
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── package.json             # Root monorepo package.json
├── pnpm-lock.yaml           # pnpm dependency lockfile
└── vitest.config.ts         # Vitest configuration

# Key Ports
PORT ALLOCATION:
  5173  main (primary dev server)
  5174  feed sub-app
  5175  user-profile sub-app
  8000  Gateway API (HTTP/2, Connect RPC)
  50051 svc-user (gRPC)
  50052 svc-content (gRPC)
  5432  PostgreSQL
  6379  Redis
  7700  Meilisearch
  8500  Consul HTTP API
  4222  NATS
  4173  preview server
```

### 1.2 Workspace Configuration

**pnpm-workspace.yaml** (simple glob-based):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- **apps/**: Each sub-app is independent, can run dev server in parallel
- **packages/**: Shared code imported via `@luhanxin/<package>` (workspace:* references)
- **services/**: Rust Cargo workspace (separate from pnpm)

---

## 2. Frontend Architecture

### 2.1 Apps Directory

#### `apps/main/` — Main Host Application

**Package**: `@luhanxin/main` (React 18)

**Structure**:
```
apps/main/
├── src/
│   ├── main.tsx             # Vite entry point
│   ├── App.tsx              # Root component (Garfish host setup)
│   ├── pages/               # Page-level components
│   │   ├── home/
│   │   ├── auth/            # Login/register pages
│   │   ├── post/            # Article detail, edit pages
│   │   └── profile/         # User profile pages
│   ├── components/          # Shared UI components
│   │   ├── GarfishContainer.tsx  # Sub-app rendering container
│   │   ├── ErrorBoundary.tsx
│   │   └── Loading.tsx
│   ├── routes/              # Route configuration (config-driven)
│   │   ├── index.ts         # RouteConfig type definition
│   │   ├── routes.tsx       # Local route configuration
│   │   └── renderRoutes.tsx # Config → React Route renderer
│   ├── stores/              # Global state (Zustand)
│   │   └── useAuthStore.ts  # Auth state (login, token, user)
│   ├── lib/                 # SDK wrappers
│   │   ├── connect.ts       # Connect RPC transport + auth interceptor
│   │   └── registry.ts      # Sub-app registry integration
│   ├── styles/              # Global styles
│   │   ├── index.css        # Tailwind + Ant Design overrides
│   │   └── variables.css    # CSS variables (design tokens)
│   └── vite-env.d.ts
├── vite.config.ts           # Main Vite config (dev server proxy, bundle splitting)
├── tsconfig.json            # TypeScript config (extends tsconfig.base.json)
└── package.json             # Dependencies: react, react-router, zustand, antd, garfish, @connectrpc/connect-web

**Key Features**:
- Garfish host (loads sub-apps via `<GarfishContainer>`)
- Connect RPC integration (all API calls via gRPC-Web + Protobuf)
- Route configuration-driven (menu auto-generated from routes)
- Dev registry middleware (exposes `/__dev_registry__` API for sub-app discovery)
```

#### `apps/feed/` — Feed Sub-Application

**Package**: `@luhanxin/feed` (React 18)

**Structure**:
```
apps/feed/
├── src/
│   ├── main.tsx             # Garfish sub-app entry
│   ├── FeedApp.tsx          # App root (exported for Garfish)
│   ├── pages/               # Feed-specific pages
│   └── components/
├── vite.config.ts           # Sub-app Vite config (port 5174)
└── package.json             # Deps: @garfish/bridge-react-v18, antd

**Key Integration Points**:
- Garfish sub-app (main.tsx exports QianKun-compatible interface for Garfish)
- Loaded by main via Garfish container
- Runs on separate port (5174 in dev)
- Auto-registered to .dev-registry.json during dev
```

#### `apps/user-profile/` — Similar to feed

**Port**: 5175 (when running in dev)

### 2.2 Route Configuration (Config-Driven)

**File**: `apps/main/src/routes/routes.tsx`

```tsx
const localRoutes: RouteConfig[] = [
  {
    path: '/',
    index: true,
    component: lazy(() => import('@/pages/home')),
    meta: {
      title: '首页',
      icon: 'HomeOutlined',
    },
  },
  {
    path: '/post/*',
    component: lazy(() => import('@/pages/post')),
    meta: { title: '文章', hidden: true },
  },
  // Sub-apps registered via registry are merged in
];
```

**RouteConfig type**: Similar to React Router but includes meta (title, icon, auth, hidden).

**Menu Generation**: Sidebar menu is auto-generated from `routes` via `meta.hidden` filter.

### 2.3 Connect RPC / Protobuf Integration

**File**: `apps/main/src/lib/connect.ts`

```tsx
// Auth interceptor adds JWT to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    req.header.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
};

// gRPC-Web transport configured for Connect RPC
export const transport = createGrpcWebTransport({
  baseUrl: '/',  // Proxied to http://localhost:8000 in dev
  interceptors: [authInterceptor],
});
```

**Usage Example**: `apps/main/src/stores/useAuthStore.ts`

```tsx
const userClient = createClient(UserService, transport);

// Automatically converts Protobuf messages to/from TypeScript
const resp = await userClient.login({ username, password });
```

**Flow**:
1. Frontend calls `UserService.login()` with TypeScript-typed message
2. `@connectrpc/connect-web` serializes to Protobuf binary
3. HTTP/2 request sent to Gateway (http://localhost:8000)
4. Gateway routes to svc-user gRPC service
5. Response Protobuf deserialized back to TypeScript type

---

## 3. Packages (Shared Frontend Libraries)

### 3.1 `packages/shared-types/`

**Purpose**: Protobuf-generated TypeScript types (single source of truth from proto/)

**Structure**:
```
packages/shared-types/
├── src/
│   ├── index.ts             # Re-exports all generated types
│   └── proto/               # buf generate output directory
│       └── luhanxin/community/v1/
│           ├── article_pb.ts
│           ├── common_pb.ts
│           ├── user_pb.ts
│           └── event_pb.ts
└── package.json
```

**Exports**:
```tsx
export * from './proto/luhanxin/community/v1/article_pb';
export * from './proto/luhanxin/community/v1/user_pb';
export { UserService } from './proto/luhanxin/community/v1/user_pb';
```

**Usage in Apps**:
```tsx
import { UserService, User, LoginRequest } from '@luhanxin/shared-types';
```

### 3.2 `packages/app-registry/`

**Purpose**: Micro-frontend sub-app discovery & registry management

**Key Exports**:
- `AppRegistry` — Core registry class (service discovery)
- `HealthChecker` — Health check polling
- `DevConfigProvider` — Development mode (reads .dev-registry.json)
- `EnvConfigProvider` — Environment-based (REACT_APP_REGISTRY_URL)
- `StaticConfigProvider` — Hardcoded app manifest
- `RemoteConfigProvider` — Fetch from backend registry API

**Architecture**:
- Single registry instance manages all sub-apps
- Lazy-loaded on first request
- Adapters for different discovery methods (dev, env, remote)
- Used by main app to dynamically inject sub-app routes/menu items

### 3.3 `packages/dev-kit/`

**Purpose**: Vite plugins + dev environment utilities

**Key Modules**:
- `vite/garfish-sub-app.ts` — Vite plugin for sub-apps (auto-registers port to .dev-registry.json)
- `vite/dev-registry-middleware.ts` — Middleware exposing `/__dev_registry__` API
- `registry-file.ts` — .dev-registry.json read/write utilities
- `types.ts` — TypeScript interfaces for registry/manifest

**Usage in vite.config.ts**:
```tsx
import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [react(), devRegistryMiddleware()],
});
```

---

## 4. Package.json & Available Scripts

### 4.1 Root `package.json`

**Scripts**:
```json
{
  "scripts": {
    "dev": "bash scripts/dev.sh",              // Start all frontend apps (daily use)
    "dev:main": "pnpm --filter @luhanxin/main dev",
    "dev:feed": "pnpm --filter @luhanxin/feed dev",
    "build": "pnpm -r build",                  // Build all
    "build:main": "pnpm --filter @luhanxin/main build",
    "preview": "bash scripts/build-preview.sh && pnpm --filter @luhanxin/main preview",
    "typecheck": "pnpm -r --parallel exec tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "proto": "cd proto && buf generate",        // Generate Protobuf code
    "test": "vitest run",                      // Run unit tests
    "test:watch": "vitest",
    "test:e2e": "playwright test",             // Run E2E tests
    "clean": "pnpm -r exec rm -rf dist node_modules"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }
}
```

### 4.2 App-Level `package.json` (e.g., `apps/main/package.json`)

**Main app dependencies**:
```json
{
  "dependencies": {
    "@connectrpc/connect": "^2.0.0",
    "@connectrpc/connect-web": "^2.0.0",
    "@luhanxin/app-registry": "workspace:*",
    "@luhanxin/shared-types": "workspace:*",
    "react": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "antd": "^5.22.0",
    "garfish": "^1.19.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 5. Vite Configuration Deep Dive

### 5.1 Main App Vite Config (`apps/main/vite.config.ts`)

**Key Settings**:

1. **Plugins**:
   - `react()` — React Fast Refresh
   - `devRegistryMiddleware()` — Exposes sub-app registry API

2. **Resolve Aliases**:
   ```ts
   alias: { '@': './src' }
   ```

3. **Dev Server Proxy** (routes gRPC requests to Gateway):
   ```ts
   server: {
     proxy: {
       '/luhanxin.community.v1': {
         target: 'http://localhost:8000',
         changeOrigin: true,
       },
     }
   }
   ```

4. **Build Optimization**:
   - **Code splitting**: `manualChunks()` groups vendor dependencies
   - **Vendor chunks**:
     - `vendor-react` — React, ReactDOM, scheduler
     - `vendor-antd` — Ant Design + rc-* components
     - `vendor-garfish` — Garfish runtime
     - `vendor-router` — React Router
     - `vendor-misc` — Other dependencies
   - **Page chunks**: Auto-split pages/ components
   - **Asset inlining**: Small assets (<4KB) converted to base64

5. **Output Structure**:
   ```
   dist/
   ├── index.html
   ├── js/
   │   ├── main-[hash].js
   │   ├── vendor-react-[hash].js
   │   ├── vendor-antd-[hash].js
   │   └── page_home-[hash].js
   ├── assets/
   │   ├── styles-[hash].css
   │   └── logo-[hash].png
   └── apps/
       ├── feed/dist/        (sub-app bundle)
       └── user-profile/dist/
   ```

### 5.2 Sub-App Vite Config (`apps/feed/vite.config.ts`)

Similar to main but typically simpler (no sub-app loading).

---

## 6. TypeScript Configuration

### 6.1 `tsconfig.base.json` (Shared Base)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 6.2 App-Level `tsconfig.json` (extends base)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 7. Protobuf / Connect RPC Setup

### 7.1 Proto Directory Structure

```
proto/
├── buf.yaml                 # Buf module config (lint rules, service suffixes)
├── buf.gen.yaml             # Code generation config
└── luhanxin/community/v1/
    ├── common.proto         # Pagination, timestamp helpers
    ├── user.proto           # UserService, User message
    ├── article.proto        # ArticleService messages
    └── event.proto          # Event message definitions
```

### 7.2 Proto Package Name

**Package**: `luhanxin.community.v1`

**Translates to**:
- TypeScript: `luhanxin.community.v1.UserService` 
- Rust: `luhanxin::community::v1::UserService`

### 7.3 Code Generation (`make proto`)

**Invokes**: `cd proto && buf generate`

**buf.gen.yaml targets**:
1. **Rust (prost)** → `services/shared/src/proto/`
2. **Rust (tonic)** → `services/shared/src/proto/` (gRPC service stubs)
3. **TypeScript (protobuf-es)** → `packages/shared-types/src/proto/`

**Post-generation**: `scripts/gen-proto-mod.sh` auto-generates `services/shared/src/proto/mod.rs`
- Scans for .rs files generated by prost
- Creates nested mod structure: `pub mod luhanxin { pub mod community { pub mod v1 { include!(...) } } }`
- Adds re-exports for flattened usage

### 7.4 User Service Example (user.proto)

```protobuf
syntax = "proto3";
package luhanxin.community.v1;

service UserService {
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc GetCurrentUser(GetCurrentUserRequest) returns (GetUserResponse);
  rpc UpdateProfile(UpdateProfileRequest) returns (UpdateProfileResponse);
}

message LoginRequest {
  string username = 1;
  string password = 2;
}

message AuthResponse {
  string token = 1;
  User user = 2;
}

message User {
  string id = 1;
  string username = 2;
  string email = 3;
  string display_name = 4;
  google.protobuf.Timestamp created_at = 5;
  // ... more fields
}
```

**TypeScript Usage**:
```tsx
import { LoginRequest, AuthResponse, UserService } from '@luhanxin/shared-types';
import { createClient } from '@connectrpc/connect';
import { transport } from '@/lib/connect';

const userClient = createClient(UserService, transport);
const response: AuthResponse = await userClient.login({
  username: 'john',
  password: 'secret123',
});
```

---

## 8. Testing Setup

### 8.1 Vitest Configuration (`vitest.config.ts`)

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**/*.{ts,tsx}'],
    },
  },
});
```

**Key Points**:
- **globals: true** — No need to import `describe`, `it`, `expect`
- **jsdom** — Browser-like environment for React component testing
- **setupFiles** — Runs `tests/setup.ts` before tests (e.g., mocking global objects)
- **CSS: true** — Process CSS imports in tests
- **Coverage**: Tracks app code (excludes main.tsx, .d.ts files)

### 8.2 Running Tests

```bash
pnpm test              # Run once
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage report
```

### 8.3 Playwright E2E Tests

**Config**: `playwright.config.ts`

```bash
pnpm test:e2e         # Run
pnpm test:e2e:ui      # UI mode
pnpm test:e2e:debug   # Debug mode
```

---

## 9. Biome Code Quality

### 9.1 Biome Configuration (`biome.json`)

**Settings**:
```json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "trailingCommas": "all"
  },
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "warn" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  }
}
```

**Commands**:
```bash
pnpm lint              # Check issues
pnpm lint:fix          # Auto-fix
pnpm format            # Format code
pnpm format:check      # Check format only
```

---

## 10. Backend Microservices (Rust)

### 10.1 Services Cargo Workspace

**Root**: `services/Cargo.toml`

```toml
[workspace]
members = ["shared", "svc-user", "svc-content", "gateway", "migration"]

[workspace.dependencies]
# Async runtime
tokio = { version = "1", features = ["full"] }
# gRPC / Protobuf
tonic = "0.14"
prost = "0.14"
tonic-web = "0.14"
# HTTP Framework
axum = { version = "0.8", features = ["macros"] }
# ORM / Database
sea-orm = { version = "1", features = ["runtime-tokio-rustls", "sqlx-postgres"] }
# Auth
jsonwebtoken = "9"
bcrypt = "0.16"
# Service Discovery
reqwest = { version = "0.12", features = ["json"] }
# Messaging
async-nats = "0.38"
```

### 10.2 Gateway Service (`services/gateway/`)

**Purpose**: HTTP/2 BFF layer + gRPC-Web bridge

**Port**: 8000 (HTTP)

**Directory Structure**:
```
gateway/src/
├── main.rs                  # Entry: init + server startup
├── config.rs                # Configuration loading
├── interceptors/            # RPC interceptors (auth, logging, retry)
│   ├── mod.rs
│   ├── auth/mod.rs
│   ├── log/mod.rs
│   └── retry/mod.rs
├── services/                # gRPC service implementations (BFF layer)
│   ├── mod.rs
│   ├── user/mod.rs          # Proxies to svc-user
│   └── article/mod.rs       # Proxies to svc-content
├── routes/                  # REST endpoints
│   ├── mod.rs
│   ├── health/mod.rs        # Health check
│   └── upload/mod.rs        # File upload (REST, not gRPC)
├── middleware/              # HTTP middleware (CORS, request-id)
│   ├── mod.rs
│   └── cors/mod.rs
├── resolver.rs              # Service resolver (Consul service discovery)
└── worker/                  # Background jobs
    └── retry_worker/mod.rs
```

**Key Responsibilities**:
- Exposes HTTP/2 + gRPC-Web interface (front-facing)
- Routes requests to gRPC microservices (svc-user, svc-content)
- Applies interceptors (auth, logging, retry)
- Handles special cases (file uploads, webhooks)
- Service discovery via Consul

### 10.3 Microservices (svc-user, svc-content)

**Example**: `services/svc-user/`

**Port**: 50051 (gRPC only, not HTTP)

**Directory Structure**:
```
svc-user/src/
├── main.rs                  # Entry: gRPC server startup + Consul registration
├── config.rs                # Configuration
├── services/                # gRPC service trait implementations
│   ├── mod.rs
│   └── user/mod.rs          # Implements UserService trait
├── handlers/                # Business logic (no tonic/grpc types)
│   ├── mod.rs
│   └── user/mod.rs          # Pure business logic for user operations
└── error.rs                 # Service-level errors
```

**Architecture**:
1. **gRPC Service Layer** (`services/user/`) — Implements proto service, handles RPC protocol
2. **Handler Layer** (`handlers/user/`) — Pure business logic, testable without gRPC
3. **Entity Layer** — SeaORM entities (auto-generated from DB)

### 10.4 Shared Library (`services/shared/`)

**Purpose**: Common utilities for all services

**Contents**:
```
shared/src/
├── proto/                   # Protobuf-generated code + re-exports
├── auth/                    # JWT + bcrypt utilities
├── database/                # SeaORM connection pool
├── entity/                  # Database entities (auto-generated)
├── discovery/               # Consul service discovery client
└── messaging/               # NATS pub/sub utilities
```

**Re-export Pattern**:
```rust
// After buf generate, gen-proto-mod.sh creates:
// shared/src/proto/mod.rs
pub mod luhanxin {
    pub mod community {
        pub mod v1 {
            include!("luhanxin/community/v1/luhanxin.community.v1.rs");
        }
    }
}
pub use luhanxin::community::v1::*;
```

**Usage in Services**:
```rust
use shared::proto::{UserService, User, LoginRequest};
use shared::auth::verify_jwt;
use shared::database::create_pool;
```

---

## 11. Development Scripts

### 11.1 `scripts/dev.sh` — Dev Server Orchestration

**Flow**:
1. Cleans old `.dev-registry.json`
2. Starts all frontend apps in parallel: `pnpm -r --parallel dev`
3. Each sub-app's Vite plugin registers to `.dev-registry.json` on startup
4. Polls `.dev-registry.json` until all expected apps registered
5. Prints summary of running apps

**Dev Registry Format** (`.dev-registry.json`):
```json
{
  "version": 1,
  "apps": {
    "feed": { "url": "http://localhost:5174", "port": 5174 },
    "user-profile": { "url": "http://localhost:5175", "port": 5175 }
  },
  "updatedAt": 1712000000
}
```

**Main app reads from `/__dev_registry__` API** (exposed by dev-registry middleware in main vite config).

### 11.2 `scripts/build-preview.sh` — Preview Assembly

**Purpose**: Bundle sub-apps and assemble into main dist/

**Steps**:
1. Build all apps: `pnpm -r build`
2. Copy sub-app bundles to `apps/main/dist/apps/`
3. Update manifest in main dist (so runtime can load sub-apps)

**Result**:
```
apps/main/dist/
├── index.html
├── js/
├── assets/
└── apps/
    ├── feed/dist/
    └── user-profile/dist/
```

### 11.3 `scripts/gen-proto-mod.sh` — Rust Proto Mod Generation

**Invoked by**: `make proto` (after buf generate)

**Function**:
- Scans `services/shared/src/proto/` for prost-generated `.rs` files
- Generates nested mod structure
- Adds re-exports for flattened imports

**Example Output**:
```rust
// services/shared/src/proto/mod.rs
pub mod luhanxin {
    pub mod community {
        pub mod v1 {
            include!("luhanxin/community/v1/luhanxin.community.v1.rs");
        }
    }
}
pub use luhanxin::community::v1::*;
```

**Enables**: `use shared::proto::UserService` instead of `use shared::proto::luhanxin::community::v1::UserService`

---

## 12. Makefile Commands Reference

**Full list**: Run `make help`

**Common Development**:
```bash
make dev              # Start frontend (daily use)
make dev-backend      # Start Rust services (Gateway + svc-user + svc-content)
make dev-infra        # Start Docker containers (PostgreSQL, Redis, Meilisearch, Consul)
make dev-full         # One-command: infra + backend + frontend

make build            # Build all (Rust release + frontend)
make test             # Run tests (unit + E2E)
make check            # Format + lint + typecheck (CI pipeline)
make fmt              # Format code (Rust + TypeScript)
make lint             # Lint all code

make proto            # Generate Protobuf code (Rust + TypeScript)
make db-migrate       # Run database migrations
make db-reset         # Drop + recreate database
make db-entity        # Generate SeaORM entities from schema
```

**Cleanup**:
```bash
make kill-ports       # Kill processes on project ports
make clean            # Remove build artifacts
make clean-all        # Deep clean (node_modules + lock ports)
```

---

## 13. Frontend Folder Organization

### 13.1 Standard App Structure (Following Project Rules)

Each `apps/*/src/` follows this pattern:

```
src/
├── pages/                   # Page-level modules (route targets)
│   ├── home/
│   │   ├── index.tsx        # Page entry (default export)
│   │   ├── components/      # Page-private components
│   │   └── home.module.less # Page styles (CSS Module)
│   ├── auth/
│   └── post/
├── components/              # Shared UI components (cross-page)
│   ├── Layout/
│   │   ├── index.tsx
│   │   └── layout.module.less
│   ├── Loading.tsx          # Simple component (no CSS)
│   └── ErrorBoundary.tsx
├── stores/                  # Global state (Zustand)
│   └── useAuthStore.ts
├── hooks/                   # Custom hooks (React only)
├── lib/                     # SDK wrappers
│   ├── connect.ts           # gRPC-Web transport
│   └── request.ts           # HTTP utilities
├── utils/                   # Pure utility functions
│   ├── formatDate.ts
│   └── validateEmail.ts
├── styles/                  # Global styles
│   ├── index.css            # Entry point (import order)
│   ├── variables.css        # CSS variables
│   ├── reset.css            # Normalize + base styles
│   └── antd-overrides.css   # Ant Design customizations
├── routes/                  # Route configuration (config-driven)
│   ├── index.ts             # RouteConfig type
│   ├── routes.tsx           # Route definitions
│   └── renderRoutes.tsx     # Config → Route renderer
├── App.tsx                  # Root component
├── main.tsx                 # Vite entry
└── vite-env.d.ts
```

### 13.2 CSS Module Organization (CSS Modules + Tailwind)

**Pattern**: Nested selectors match DOM nesting

```css
/* layout.module.less */
.header {
  @apply sticky top-0 z-50 bg-white;
  height: 48px;
  border-bottom: 1px solid #e4e6eb;

  .headerInner {
    @apply max-w-5xl mx-auto px-6 h-full flex items-center justify-between;
  }

  .logo {
    @apply flex items-center gap-2 no-underline;
  }
}
```

**TypeScript**:
```tsx
import styles from './layout.module.less';

export function Layout() {
  return (
    <div className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logo}>Logo</div>
      </div>
    </div>
  );
}
```

---

## 14. Common Development Workflows

### 14.1 Adding a New Frontend Page

1. Create `apps/main/src/pages/mynew/` directory
2. Create `apps/main/src/pages/mynew/index.tsx` (default export)
3. Add route to `apps/main/src/routes/routes.tsx`:
   ```tsx
   { path: '/mynew', component: lazy(() => import('@/pages/mynew')), meta: { title: 'My New Page' } }
   ```
4. Menu auto-generates from route config
5. No need to manually update menus or route lists

### 14.2 Using Connect RPC in Component

```tsx
import { createClient } from '@connectrpc/connect';
import { UserService, GetUserRequest } from '@luhanxin/shared-types';
import { transport } from '@/lib/connect';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const client = createClient(UserService, transport);
    client
      .getUser({ userId })
      .then((resp) => setUser(resp.user))
      .catch(setError);
  }, [userId]);

  return user ? <div>{user.displayName}</div> : <div>Loading...</div>;
}
```

### 14.3 Adding a New Proto Message & Service

1. Edit `proto/luhanxin/community/v1/xxx.proto`
2. Run `make proto` (generates Rust + TypeScript)
3. TypeScript types automatically in `@luhanxin/shared-types`
4. Rust types in `shared::proto::*`
5. Implement service in `services/svc-xxx/src/services/`
6. Update Gateway to route requests to new service

### 14.4 Debugging Backend Service

```bash
# Watch + rebuild + run svc-user with logs
cd services && RUST_LOG=svc_user=debug cargo watch -x 'run --bin svc-user'

# Or run once
cd services && RUST_LOG=svc_user=debug cargo run --bin svc-user
```

**Check Health**:
```bash
curl http://localhost:8000/health
```

---

## 15. Key Files Reference

| File | Purpose |
|------|---------|
| `Makefile` | Development command integration (run `make help`) |
| `package.json` | Root monorepo scripts + dependencies |
| `pnpm-workspace.yaml` | Workspace configuration (apps/*, packages/*) |
| `tsconfig.base.json` | Shared TypeScript config |
| `biome.json` | Code quality rules (format + lint) |
| `vitest.config.ts` | Unit test config (vitest) |
| `playwright.config.ts` | E2E test config (Playwright) |
| `services/Cargo.toml` | Rust workspace config |
| `proto/buf.yaml` | Protobuf module + lint config |
| `proto/buf.gen.yaml` | Protobuf code generation targets |
| `.dev-registry.json` | Dev-time sub-app registry (auto-generated) |
| `.codebuddy/rules/` | Project-specific rules & conventions |
| `docs/design/` | Architecture decisions (date-organized) |
| `docs/tech/` | Technology research & selection |

---

## 16. Environment & Tools

### 16.1 Required Tools

```bash
rustc --version          # Rust compiler (stable)
node --version           # Node.js 20+
pnpm --version           # pnpm 9+
docker --version         # Docker 24+
buf version              # buf CLI (Protocol Buffer)
```

### 16.2 Install & Setup

```bash
# Fresh clone setup
make setup               # Checks tools, installs Rust CLI tools, pnpm install

# Or manual steps:
pnpm install             # Install frontend dependencies
cd services && cargo build  # Pre-download Rust dependencies
cd proto && buf generate && scripts/gen-proto-mod.sh  # Generate proto code
```

### 16.3 Ports

**Ensure these are free before dev**:
- 5173, 5174, 5175 (frontend apps)
- 8000 (Gateway)
- 50051, 50052 (gRPC services)
- 5432 (PostgreSQL)
- 6379 (Redis)
- 7700 (Meilisearch)
- 8500 (Consul)
- 4222 (NATS)

**Kill if needed**: `make kill-ports`

---

## 17. Performance & Optimization

### 17.1 Frontend Build Optimization

**Code splitting strategy** (vite.config.ts):
- Vendor chunks separated (react, antd, garfish, router)
- Page chunks auto-split
- Async imports lazy-loaded
- Assets <4KB inlined as base64

**Result**: Faster initial page load, better caching of stable vendor chunks.

### 17.2 Database Query Optimization

**SeaORM Best Practices**:
- Use column selection: `.column(Column::Id).column(Column::Name)`
- Index frequently queried fields
- Use pagination (limit + offset)
- Profile with `RUST_LOG=sqlx=debug`

---

## 18. CI/CD & Git Workflow

### 18.1 Pre-commit Checks

```bash
make check               # Format + lint + typecheck
# Must pass before commit (enforced by husky hooks)
```

### 18.2 Git Commit Format

```
<type>(<scope>): <subject>

Scopes: main, feed, profile, search, gateway, svc-user, proto, shared-types, docs, infra
Types: feat, fix, docs, style, refactor, perf, test, chore, ci
```

---

## 19. Troubleshooting

### 19.1 Port Already in Use

```bash
lsof -iTCP -sTCP:LISTEN -P | grep -E '(5173|8000|50051)'
make kill-ports
```

### 19.2 Protobuf Generation Failed

```bash
# Verify buf is installed
buf version

# Check proto files are valid
cd proto && buf lint

# Regenerate
make proto
```

### 19.3 Frontend Build Issues

```bash
# Clean and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### 19.4 Backend Cargo Build Failed

```bash
# Clean and rebuild
cd services && cargo clean
cargo build

# Check Rust version
rustc --version  # Should be stable
```

---

## 20. Additional Resources

- **Project Rules**: `.codebuddy/rules/` directory
- **Design Docs**: `docs/design/` (dated folders)
- **Tech Docs**: `docs/tech/` (technology research)
- **OpenSpec**: `openspec/` (change workflow)
- **Main README**: `README.md`

---

**Last Updated**: April 1, 2026  
**Next Review**: After major architecture changes

