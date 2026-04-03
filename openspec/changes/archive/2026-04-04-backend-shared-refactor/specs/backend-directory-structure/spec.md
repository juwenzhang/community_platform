## MODIFIED Requirements

### Requirement: 微服务通用目录结构

每个微服务（svc-xxx）SHALL 遵循统一的目录结构：

```
svc-xxx/src/
├── main.rs                    # 入口：gRPC Server 启动 + Consul 注册
├── config.rs                  # 配置加载（引用 shared::config::AppConfig）
├── services/                  # gRPC Service trait 实现
│   ├── mod.rs
│   └── xxx/mod.rs
├── handlers/                  # 业务逻辑层（调用 Repository，不直接操作 DB）
│   ├── mod.rs
│   └── xxx/mod.rs
├── repositories/              # 🆕 数据访问层（封装 SeaORM 查询）
│   ├── mod.rs                 # RepositoryError 定义 + re-export
│   └── xxx/mod.rs             # Repository trait + SeaORM 实现
├── models/                    # 数据模型（SeaORM Entity）
│   └── mod.rs
└── error.rs                   # 服务级错误定义（引用 shared::error::AppError）
```

- `services/` 层：实现 Tonic gRPC trait，只做请求解析 + 调用 handler + 构造响应
- `handlers/` 层：纯业务逻辑，通过 Repository trait 访问数据，不直接依赖 `DatabaseConnection`
- `repositories/` 层：**新增** — 封装所有 SeaORM 查询操作，定义 Repository trait + 实现
- `models/` 层：数据模型（SeaORM Entity），后续数据库接入时使用
- `error.rs`：引用 `shared::error::AppError`，而非各自定义独立错误

#### Scenario: svc-user 目录包含 repositories 层

- **WHEN** 查看 `svc-user/src/` 目录结构
- **THEN** 包含 `repositories/` 目录，内含 `mod.rs` 和 `user/mod.rs`

#### Scenario: handler 不直接操作 DatabaseConnection

- **WHEN** 查看 `svc-user/src/handlers/user/mod.rs` 代码
- **THEN** 不存在 `sea_orm::EntityTrait`、`sea_orm::QueryFilter` 等直接查询代码，只通过 `UserRepository` trait 方法访问数据

#### Scenario: 重组织后编译通过

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** 所有微服务编译成功

### Requirement: Shared Crate 模块组织

`shared` crate SHALL 按功能领域组织模块：

```
shared/src/
├── lib.rs                     # 导出所有公共模块
├── proto/                     # Proto 生成代码（已有）
├── config.rs                  # 通用配置（已有，需激活使用）
├── error.rs                   # 通用错误（已有，需激活使用）
├── net.rs                     # 网络工具（已有）
├── discovery/                 # Consul 服务发现
│   └── mod.rs
├── messaging/                 # NATS 消息
│   └── mod.rs
├── database/                  # 数据库连接池封装
│   └── mod.rs
├── entity/                    # SeaORM Entity 自动生成代码
│   ├── mod.rs
│   ├── users.rs
│   └── articles.rs
├── auth/                      # JWT 认证
│   └── mod.rs
├── convert/                   # 🆕 Proto ↔ Model 转换函数
│   ├── mod.rs
│   ├── datetime.rs
│   ├── user.rs
│   └── article.rs
├── extract/                   # 🆕 gRPC 请求提取工具
│   └── mod.rs
└── constants.rs               # 🆕 编译期常量
```

#### Scenario: 所有新模块可正常导出

- **WHEN** gateway 引用 `shared::convert::user_model_to_proto`、`shared::extract::extract_user_id`、`shared::constants::SVC_USER`
- **THEN** 编译成功，类型和函数可正常使用

#### Scenario: config 和 error 模块被实际使用

- **WHEN** svc-user 引用 `shared::config::AppConfig` 和 `shared::error::AppError`
- **THEN** 编译成功，替代了之前各微服务自定义的 config/error
