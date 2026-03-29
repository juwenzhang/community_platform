# grpcurl 测试技巧 — gRPC API 命令行调试

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · gRPC · 测试 · grpcurl

---

## 1. 问题背景

Gateway 是 gRPC-Web 服务（tonic + tonic-web），不是 REST API。`curl` 无法直接调用 gRPC 方法（二进制 Protobuf 格式），需要专门的 gRPC 客户端工具。

## 2. 工具选择

| 工具 | 类型 | 适合场景 |
|------|------|---------|
| **grpcurl** | CLI | 命令行快速测试，CI/CD 脚本 |
| **grpcui** | Web UI | 浏览器交互式测试（类似 Postman） |
| **Postman** | GUI | 支持 gRPC，但配置繁琐 |
| **前端 Demo 页** | 浏览器 | 端到端验证（走完整链路） |
| **Swagger UI** | 浏览器 | REST proxy 测试（非 gRPC 原生） |

**推荐 `grpcurl`**：轻量、脚本化、CI 友好。

## 3. 安装

```bash
# macOS
brew install grpcurl

# Linux
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# 验证
grpcurl --version
```

## 4. 基本用法

### 4.1 关键参数

```bash
grpcurl [flags] host:port package.Service/Method
```

| 参数 | 说明 |
|------|------|
| `-plaintext` | 不使用 TLS（开发环境必须） |
| `-import-path proto` | Proto 文件搜索路径 |
| `-proto <file>` | 指定 proto 文件（可多个） |
| `-d '<json>'` | 请求 body（JSON 格式，自动转 Protobuf） |
| `-H 'key: value'` | 设置 metadata header |

### 4.2 为什么需要 `-import-path` 和 `-proto`？

Gateway 没有启用 gRPC reflection（`tonic-reflection`），grpcurl 无法自动发现 proto schema。必须手动指定 proto 文件：

```bash
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  ...
```

> **提示**：如果有多个 proto 互相 import，所有被引用的都要 `-proto` 指定。

## 5. 本项目常用命令

### 5.1 公开方法（无需 token）

```bash
# 用户注册
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -d '{"username":"alice","email":"alice@test.com","password":"Pass1234"}' \
  localhost:8000 luhanxin.community.v1.UserService/Register

# 用户登录
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -d '{"username":"alice","password":"Pass1234"}' \
  localhost:8000 luhanxin.community.v1.UserService/Login

# 按用户名查询
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -d '{"username":"luhanxin"}' \
  localhost:8000 luhanxin.community.v1.UserService/GetUserByUsername

# 用户列表（分页）
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -d '{"query":"","pagination":{"page_size":10}}' \
  localhost:8000 luhanxin.community.v1.UserService/ListUsers
```

### 5.2 需认证方法（携带 JWT token）

```bash
# 先登录获取 token
TOKEN=$(grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -d '{"username":"alice","password":"Pass1234"}' \
  localhost:8000 luhanxin.community.v1.UserService/Login \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 用 token 调用需认证方法
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -H "authorization: Bearer $TOKEN" \
  -d '{"display_name":"Alice Updated","bio":"Hello!"}' \
  localhost:8000 luhanxin.community.v1.UserService/UpdateProfile

# 获取当前用户（从 token 识别）
grpcurl -plaintext \
  -import-path proto \
  -proto luhanxin/community/v1/user.proto \
  -proto luhanxin/community/v1/common.proto \
  -H "authorization: Bearer $TOKEN" \
  -d '{}' \
  localhost:8000 luhanxin.community.v1.UserService/GetCurrentUser
```

### 5.3 错误场景验证

```bash
# 密码错误 → Unauthenticated
grpcurl -plaintext ... \
  -d '{"username":"alice","password":"wrong"}' \
  localhost:8000 .../Login
# 输出: Code: Unauthenticated, Message: Invalid credentials

# 重复注册 → AlreadyExists
grpcurl -plaintext ... \
  -d '{"username":"alice","email":"new@test.com","password":"Pass1234"}' \
  localhost:8000 .../Register
# 输出: Code: AlreadyExists, Message: Username 'alice' is already taken

# 无 token 调需认证方法 → Unauthenticated
grpcurl -plaintext ... \
  -d '{"display_name":"Hacker"}' \
  localhost:8000 .../UpdateProfile
# 输出: Code: Unauthenticated, Message: Missing authorization token
```

## 6. 使用技巧

### 6.1 简化命令（Shell alias）

```bash
# 在 ~/.zshrc 中添加
alias grpc='grpcurl -plaintext -import-path proto -proto luhanxin/community/v1/user.proto -proto luhanxin/community/v1/common.proto'

# 之后就可以简写
grpc -d '{"username":"alice","password":"Pass1234"}' localhost:8000 luhanxin.community.v1.UserService/Login
```

### 6.2 格式化输出

grpcurl 默认输出 JSON。结合 `jq` 更好看：

```bash
grpc -d '{}' localhost:8000 .../ListUsers | jq '.users[].username'
```

### 6.3 直连微服务（跳过 Gateway）

调试时可以直接连 svc-user，跳过 Gateway 拦截器：

```bash
grpc -d '{"user_id":"xxx"}' localhost:50051 luhanxin.community.v1.UserService/GetUser
```

## 7. 与 REST proxy 的对比

| 维度 | grpcurl (gRPC 原生) | curl (REST proxy) |
|------|--------------------|--------------------|
| 协议 | gRPC (HTTP/2 + Protobuf) | REST (HTTP/1.1 + JSON) |
| 端点 | `package.Service/Method` | `/api/v1/users/:id` |
| 覆盖范围 | 所有 RPC 方法 | 仅 Swagger 注册的端点 |
| 认证测试 | `-H "authorization: Bearer ..."` | `-H "Authorization: Bearer ..."` |
| 适合场景 | 后端开发、CI 测试 | 前端对接、Swagger UI 测试 |

## 8. 参考资料

- [grpcurl GitHub](https://github.com/fullstorydev/grpcurl)
- [gRPC Testing Best Practices](https://grpc.io/docs/guides/testing/)
