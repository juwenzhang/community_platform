---
title: Luhanxin Community Platform Backend
emoji: 🦀
colorFrom: red
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Luhanxin Community Platform — Backend

All-in-One backend service for [Luhanxin Community Platform](https://github.com/luhanxin/community_platform).

## Services

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 7860 (external) | Reverse proxy |
| Gateway | 8000 | HTTP API Gateway (Connect RPC + REST + Swagger) |
| svc-user | 50051 | User service (gRPC) |
| svc-content | 50052 | Content service (gRPC) |
| svc-notification | 50053 | Notification service (gRPC) |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| NATS | 4222 | Message queue |
| Consul | 8500 | Service discovery |
| Meilisearch | 7700 | Full-text search |

## Endpoints

- **API**: `https://luhanxin-comunity-platform-backend.hf.space/api/`
- **Swagger UI**: `https://luhanxin-comunity-platform-backend.hf.space/swagger-ui/`
- **Health Check**: `https://luhanxin-comunity-platform-backend.hf.space/health`
- **Connect RPC**: `https://luhanxin-comunity-platform-backend.hf.space/luhanxin.community.v1.*`

## Tech Stack

- **Language**: Rust (Axum + Tonic)
- **Protocol**: Connect RPC (gRPC-Web + Protobuf)
- **Database**: PostgreSQL 16 + SeaORM
- **Cache**: Redis 7
- **Search**: Meilisearch
- **Message Queue**: NATS
- **Service Discovery**: Consul

## Note

⚠️ This is an ephemeral deployment — all data resets on container restart.
Database migrations run automatically on startup.
