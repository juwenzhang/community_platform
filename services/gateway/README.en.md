# Gateway — HTTP API Gateway

> English | [中文](./README.md)

The **BFF (Backend for Frontend) gateway** for Luhanxin Community Platform, built with Axum 0.8.

## Responsibilities

- **Connect RPC Proxy**: Receives gRPC-Web requests from frontend, forwards to microservices
- **REST Endpoints**: Upload signing (`POST /api/v1/upload/sign`), health check (`GET /health`)
- **Interceptor Pipeline**: Auth (JWT), logging, retry — cross-cutting concerns
- **Service Discovery**: Resolves downstream services dynamically via Consul
- **API Docs**: utoipa + Swagger UI (`/swagger-ui/`)
- **CORS**: Configurable cross-origin support

## Port

| Port | Protocol | Description |
|------|----------|-------------|
| 8000 | HTTP/2 | Connect RPC + REST |

## Run

```bash
# Hot-reload (recommended)
cd services && RUST_LOG=gateway=info cargo watch -q -x 'run --bin gateway'

# Normal
cd services && RUST_LOG=gateway=info cargo run --bin gateway

# Via Makefile
make dev-backend
```

> Ensure svc-user (:50051) and svc-content (:50052) are running before starting Gateway.

## Verify

```bash
curl http://localhost:8000/health
# → {"status":"ok"}

open http://localhost:8000/swagger-ui/
```

## Dependencies

`axum`, `tonic`, `tonic-web`, `tower-http` (CORS/Trace), `utoipa`, `utoipa-swagger-ui`, `prost`, `serde_json`
