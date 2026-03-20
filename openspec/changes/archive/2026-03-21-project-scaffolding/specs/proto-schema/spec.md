## ADDED Requirements

### Requirement: Proto 目录结构

系统 SHALL 在项目根目录下创建 `proto/` 目录，包含 buf 配置文件和按领域组织的 `.proto` 文件。

目录结构：
```
proto/
├── buf.yaml
├── buf.gen.yaml
├── buf.lock
└── community/
    └── v1/
        ├── common.proto
        ├── user.proto
        └── article.proto
```

#### Scenario: Proto 目录存在且结构正确
- **WHEN** 开发者 clone 项目后查看 `proto/` 目录
- **THEN** 目录结构与上述规范一致，包含 buf 配置和至少 3 个 `.proto` 文件

### Requirement: Common Proto 定义

`common.proto` SHALL 定义公共类型，供其他 proto 文件引用，包括：
- `Timestamp` 消息（如果不使用 `google.protobuf.Timestamp`）
- `PaginationRequest` 消息（`page_size`, `page_token` 字段）
- `PaginationResponse` 消息（`next_page_token`, `total_count` 字段）

包名 MUST 为 `luhanxin.community.v1`。

#### Scenario: Common 类型可被其他 proto 引用
- **WHEN** `user.proto` 或 `article.proto` 使用 `import "community/v1/common.proto"`
- **THEN** 可以成功引用 `PaginationRequest` 和 `PaginationResponse` 类型

### Requirement: User Proto 定义

`user.proto` SHALL 定义用户服务的骨架接口，包括：
- `UserService` 服务，包含 `GetUser` RPC 方法
- `GetUserRequest` 消息（`string user_id` 字段）
- `GetUserResponse` 消息（`User user` 字段）
- `User` 消息（`string id`, `string username`, `string email`, `google.protobuf.Timestamp created_at` 字段）

#### Scenario: User Proto 可通过 buf lint 检查
- **WHEN** 运行 `buf lint` 命令
- **THEN** `user.proto` 无 lint 错误

#### Scenario: GetUser RPC 定义正确
- **WHEN** 查看 `UserService` 的 `GetUser` 方法
- **THEN** 输入为 `GetUserRequest`，输出为 `GetUserResponse`，遵循独立 Request/Response 消息规范

### Requirement: Article Proto 定义

`article.proto` SHALL 定义文章服务的骨架接口，包括：
- `ArticleService` 服务，包含 `GetArticle` 和 `ListArticles` RPC 方法
- 对应的 Request/Response 消息
- `Article` 消息（`string id`, `string title`, `string slug`, `string author_id`, `google.protobuf.Timestamp created_at` 字段）
- `ListArticles` 使用 `PaginationRequest`/`PaginationResponse`

#### Scenario: Article Proto 引用 Common 类型
- **WHEN** 查看 `ListArticlesRequest`
- **THEN** 包含 `luhanxin.community.v1.PaginationRequest pagination` 字段

### Requirement: Buf 配置正确

`buf.yaml` SHALL 配置 lint 和 breaking change 检测规则。`buf.gen.yaml` SHALL 配置两个代码生成目标：

1. **Rust (prost)**: 生成到 `services/shared/src/proto/`
2. **TypeScript (protobuf-es)**: 生成到 `packages/shared-types/src/proto/`

#### Scenario: buf generate 成功生成 Rust 代码
- **WHEN** 运行 `buf generate` 命令
- **THEN** 在 `services/shared/src/proto/` 下生成 `.rs` 文件，包含 `User`、`Article` 等 struct 定义

#### Scenario: buf generate 成功生成 TypeScript 代码
- **WHEN** 运行 `buf generate` 命令
- **THEN** 在 `packages/shared-types/src/proto/` 下生成 `.ts` 文件，包含类型定义和 service client

#### Scenario: buf lint 通过
- **WHEN** 运行 `buf lint` 命令
- **THEN** 所有 `.proto` 文件通过 lint 检查，无错误输出
