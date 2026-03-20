# Protobuf 定义 — `proto/`

Luhanxin Community Platform 的 **Protocol Buffers 定义**，是前后端 API 契约的 **唯一真相源 (Single Source of Truth)**。

## 概述

所有前后端 API 交互使用 Protobuf 定义，通过 [buf](https://buf.build/) 同时生成 Rust 和 TypeScript 代码。

```
proto/*.proto
    │
    ├── buf generate ──▶ Rust (prost + tonic)     → services/shared/src/proto/
    │
    └── buf generate ──▶ TypeScript (protobuf-es) → packages/shared-types/src/proto/
```

## 目录结构

```
proto/
├── buf.yaml            # Buf 模块配置 (lint + breaking 规则)
├── buf.gen.yaml        # 代码生成配置 (Rust + TypeScript 目标)
├── buf.lock            # 依赖锁定
└── community/
    └── v1/
        ├── user.proto      # 用户服务 (UserService)
        ├── article.proto   # 文章服务 (ArticleService)
        └── common.proto    # 公共类型 (分页、时间戳)
```

## 快速使用

### 生成代码

```bash
# 从 proto/ 目录
cd proto && buf generate

# 或从项目根目录
pnpm proto

# 或使用 Makefile
make proto
```

### Lint 检查

```bash
cd proto && buf lint
```

### 不兼容变更检测

```bash
cd proto && buf breaking --against '.git#subdir=proto'
```

## 编写规范

### 基本规则

- 使用 `syntax = "proto3"`
- 包名格式：`luhanxin.community.v1`
- 每个 Service 方法使用独立的 Request/Response message
- 字段号一旦分配不可复用，删除字段使用 `reserved`

### 示例

```protobuf
syntax = "proto3";

package luhanxin.community.v1;

service UserService {
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message User {
  string id = 1;
  string username = 2;
  string email = 3;
  string display_name = 4;
  string avatar_url = 5;
  string bio = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}
```

### 命名约定

| 类型 | 格式 | 示例 |
|------|------|------|
| 包名 | `lowercase.dot.separated` | `luhanxin.community.v1` |
| Service | `PascalCaseService` | `UserService` |
| RPC 方法 | `PascalCase` | `GetUser` |
| Message | `PascalCase` | `GetUserRequest` |
| 字段 | `snake_case` | `user_id` |
| Enum | `PascalCase` | `ArticleStatus` |
| Enum 值 | `SCREAMING_SNAKE_CASE` | `ARTICLE_STATUS_DRAFT` |
| Enum 零值 | `*_UNSPECIFIED` | `ARTICLE_STATUS_UNSPECIFIED` |

## 代码生成目标

### Rust (prost + tonic)

```
输出: services/shared/src/proto/
插件: protoc-gen-prost + protoc-gen-tonic
```

- prost 生成消息类型 (`struct`)
- tonic 生成 gRPC server/client (`trait` + `impl`)

### TypeScript (protobuf-es)

```
输出: packages/shared-types/src/proto/
插件: protoc-gen-es (target=ts)
```

- 生成 `*_pb.ts` 文件，包含消息 Schema 和 Service 定义
- 与 `@connectrpc/connect-web` 配合使用

## Buf 配置说明

### buf.yaml

```yaml
version: v2
lint:
  use:
    - STANDARD                    # 使用标准 lint 规则集
  enum_zero_value_suffix: _UNSPECIFIED  # Enum 零值后缀
  service_suffix: Service         # Service 名必须以 Service 结尾
breaking:
  use:
    - FILE                        # 按文件级别检测不兼容变更
```

### buf.gen.yaml

```yaml
version: v2
clean: true                       # 生成前清理旧文件
plugins:
  - local: protoc-gen-prost       # Rust 消息类型
  - local: protoc-gen-tonic       # Rust gRPC stubs
  - local: protoc-gen-es          # TypeScript 类型
```

## 先决条件

```bash
# 安装 buf CLI
brew install bufbuild/buf/buf

# 安装 protoc 编译器
brew install protobuf

# 安装 Rust 代码生成器
cargo install protoc-gen-prost protoc-gen-tonic

# 安装 TypeScript 代码生成器
pnpm add -D @bufbuild/protoc-gen-es   # 或全局安装
```

## 新增 Proto 文件指南

1. 在 `proto/community/v1/` 目录下新建 `.proto` 文件
2. 定义 `package luhanxin.community.v1;`
3. 定义 Service 和 Message
4. 运行 `cd proto && buf lint` 检查规范
5. 运行 `cd proto && buf generate` 生成代码
6. 在 Rust 端 (`services/shared/src/proto/mod.rs`) 和 TS 端 (`packages/shared-types/src/index.ts`) 添加导出
