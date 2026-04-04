# Rust Backend Services — `services/`

> English | [中文](./README.md)

Backend microservice workspace for Luhanxin Community Platform, built with **Rust + Axum + Tonic gRPC + SeaORM**.

## Architecture

```
                          ┌──────────────────┐
  Browser (Connect RPC) ──▶│    Gateway       │ :8000
                          │  (Axum + Tonic)  │
                          └───────┬──────────┘
                                  │ gRPC (Consul discovery)
                     ┌────────────┼────────────┐
                     ▼                         ▼
              ┌─────────────┐          ┌──────────────┐
              │  svc-user   │ :50051   │ svc-content  │ :50052
              │  (Tonic)    │          │  (Tonic)     │
              └──────┬──────┘          └──────┬───────┘
                     └──────────┬─────────────┘
                          ┌─────▼──────┐
                          │ PostgreSQL │
                          │ Redis/NATS │
                          └────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| [gateway](./gateway/) | 8000 | HTTP Gateway (BFF, Swagger UI, Connect RPC proxy) |
| [svc-user](./svc-user/) | 50051 | User service (auth, profiles) |
| [svc-content](./svc-content/) | 50052 | Content service (articles, comments, social) |
| [shared](./shared/) | — | Shared library (proto, config, auth, discovery) |
| [migration](./migration/) | — | Database migrations (SeaORM) |

## Quick Start

```bash
make dev-infra      # Start Docker infrastructure
make proto          # Generate Protobuf code
make db-migrate     # Run database migrations
make dev-backend    # Start all backend services (hot-reload)
```

## Commands

| Command | Description |
|---------|-------------|
| `cargo build` | Build workspace |
| `cargo build --release` | Release build (LTO + strip) |
| `cargo test --all-targets` | Run all tests |
| `cargo clippy --all-targets --all-features -- -D warnings` | Lint (pedantic) |
| `cargo fmt --all` | Format |

## Environment Variables

All variables are configured in `docker/.env` (auto-included by Makefile).

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection (**required**) |
| `REDIS_URL` | `redis://...` | Redis connection |
| `JWT_SECRET` | `dev_jwt_secret_...` | JWT signing secret (**required**) |
| `GATEWAY_PORT` | `8000` | Gateway HTTP port |
| `SVC_USER_PORT` | `50051` | svc-user gRPC port |
| `SVC_CONTENT_PORT` | `50052` | svc-content gRPC port |

## Workspace Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| tokio | 1.x | Async runtime |
| tonic | 0.14 | gRPC framework |
| prost | 0.14 | Protobuf codec |
| axum | 0.8 | HTTP framework |
| sea-orm | 1.x | ORM (PostgreSQL) |
| tower-http | 0.6 | HTTP middleware |
| async-nats | 0.38 | NATS client |
| utoipa | 5.x | OpenAPI docs |
