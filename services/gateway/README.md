# Gateway — HTTP API 网关

> [English](./README.en.md) | 中文

Luhanxin Community Platform 的 **BFF（Backend for Frontend）网关**，基于 Axum 0.8。

## 职责

- **Connect RPC 代理**：接收前端 gRPC-Web 请求，转发到对应微服务
- **REST 端点**：文件上传签名（`POST /api/v1/upload/sign`）、健康检查（`GET /health`）
- **拦截器管线**：认证（JWT 校验）、日志、重试等横切关注点
- **服务发现**：通过 Consul 动态解析下游服务地址
- **API 文档**：utoipa + Swagger UI（`/swagger-ui/`）
- **CORS**：配置化跨域支持

## 端口

| 端口 | 协议 | 说明 |
|------|------|------|
| 8000 | HTTP/2 | Connect RPC + REST |

## 启动

```bash
# 热重载（推荐）
cd services && RUST_LOG=gateway=info cargo watch -q -x 'run --bin gateway'

# 普通启动
cd services && RUST_LOG=gateway=info cargo run --bin gateway

# 通过 Makefile
make dev-backend
```

> Gateway 启动前需确保 svc-user (:50051) 和 svc-content (:50052) 已运行。

## 验证

```bash
curl http://localhost:8000/health
# → {"status":"ok"}

open http://localhost:8000/swagger-ui/
```

## 目录结构

```
gateway/src/
├── main.rs              # 入口：初始化 + 启动
├── config.rs            # 配置加载
├── interceptors/        # RPC 拦截器（认证、日志、重试）
│   └── mod.rs
├── services/            # gRPC Service trait 实现（BFF 层）
│   └── mod.rs
├── routes/              # REST 路由
│   └── mod.rs
├── middleware/           # HTTP 中间件（CORS）
│   └── mod.rs
└── resolver.rs          # ServiceResolver（Consul 动态路由）
```

## 依赖

`axum`, `tonic`, `tonic-web`, `tower-http` (CORS/Trace), `utoipa`, `utoipa-swagger-ui`, `prost`, `serde_json`
