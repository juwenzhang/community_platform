# Docker Infrastructure — `docker/`

> English | [中文](./README.md)

**Local development infrastructure** for Luhanxin Community Platform.

## Services

| Service | Image | Container | Port | Purpose |
|---------|-------|-----------|------|---------|
| PostgreSQL | `postgres:16-alpine` | `luhanxin-postgres` | 5432 | Primary database |
| Redis | `redis:7-alpine` | `luhanxin-redis` | 6379 | Cache + message queue |
| Meilisearch | `getmeili/meilisearch:latest` | `luhanxin-meilisearch` | 7700 | Full-text search |
| Consul | `hashicorp/consul:latest` | `luhanxin-consul` | 8500 | Service discovery |
| NATS | `nats:latest` | `luhanxin-nats` | 4222 | Message queue |

## Quick Start

```bash
# Configure (first time)
cp docker/.env.example docker/.env

# Start all services
make dev-infra

# Stop
make dev-infra-down

# View logs
make dev-infra-logs
```

## Connection Info

| Service | Connection String |
|---------|-------------------|
| PostgreSQL | `postgresql://luhanxin:luhanxin_dev_2024@localhost:5432/luhanxin_community` |
| Redis | `redis://:redis_dev_2024@localhost:6379` |
| Meilisearch | `http://localhost:7700` (Master Key: `meili_dev_master_key_2024`) |
| Consul | `http://localhost:8500` |
| NATS | `nats://localhost:4222` |

## Data Persistence

Data is stored in Docker volumes. `docker compose down` preserves data. Use `docker compose down -v` to delete all data.

| Volume | Service |
|--------|---------|
| `luhanxin_postgres_data` | PostgreSQL |
| `luhanxin_redis_data` | Redis |
| `luhanxin_meili_data` | Meilisearch |
