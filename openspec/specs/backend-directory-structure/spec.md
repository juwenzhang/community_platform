## Purpose

定义后端 Gateway 和微服务的模块化目录结构规范，确保代码组织一致、职责清晰。

## Requirements

### Requirement: Gateway 模块化目录结构

Gateway crate SHALL 从单文件 `main.rs` 重组织为模块化目录结构：

```
gateway/src/
├── main.rs                    # 入口：初始化 + 启动
├── config.rs                  # 配置加载
├── interceptors/              # RPC 拦截器
│   ├── mod.rs
│   ├── log.rs
│   ├── auth.rs                # 占位
│   └── retry.rs               # 占位
├── services/                  # gRPC Service trait 实现
│   ├── mod.rs
│   └── user.rs
├── routes/                    # REST 路由
│   ├── mod.rs
│   └── health.rs
├── middleware/                 # HTTP 中间件
│   ├── mod.rs
│   └── cors.rs
├── resolver.rs                # ServiceResolver
└── worker/                    # 后台任务
    ├── mod.rs
    └── retry_worker.rs
```

- `main.rs` 只负责：加载配置、初始化各模块、启动服务器
- 每个模块有明确的单一职责
- 重组织后行为不变（纯重构）

#### Scenario: 重组织后编译通过

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** gateway crate 编译成功，无错误

#### Scenario: 重组织后功能不变

- **WHEN** 启动 gateway 后发送 `GET /health` 和 `GetUser` gRPC-Web 请求
- **THEN** 响应与重组织前完全一致

### Requirement: 微服务通用目录结构

每个微服务（svc-xxx）SHALL 遵循统一的目录结构：

```
svc-xxx/src/
├── main.rs                    # 入口：gRPC Server 启动 + Consul 注册
├── config.rs                  # 配置加载
├── services/                  # gRPC Service trait 实现
│   ├── mod.rs
│   └── xxx_service.rs
├── handlers/                  # 业务逻辑层
│   ├── mod.rs
│   └── xxx_handler.rs
├── models/                    # 数据模型（后续按需添加）
│   └── mod.rs
└── error.rs                   # 服务级错误定义
```

- `services/` 层：实现 Tonic gRPC trait，只做请求解析 + 调用 handler + 构造响应
- `handlers/` 层：纯业务逻辑，不依赖 tonic 类型，可独立单元测试
- `models/` 层：数据模型（SeaORM Entity），后续数据库接入时使用

#### Scenario: svc-user 目录重组织后编译通过

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** svc-user crate 编译成功

#### Scenario: svc-user 重组织后功能不变

- **WHEN** 使用 gRPC 客户端调用 svc-user 的 `GetUser` RPC
- **THEN** 返回与重组织前相同的 mock 用户数据

### Requirement: Shared Crate 模块组织

`shared` crate SHALL 按功能领域组织模块：

```
shared/src/
├── lib.rs                     # 导出所有公共模块
├── proto/                     # Proto 生成代码（已有）
├── config.rs                  # 通用配置（已有）
├── error.rs                   # 通用错误（已有）
├── net.rs                     # 网络工具（已有）
├── discovery/                 # Consul 服务发现（新增）
│   └── mod.rs
└── messaging/                 # NATS 消息（新增）
    └── mod.rs
```

#### Scenario: 所有模块可正常导出

- **WHEN** gateway 或 svc-user 引用 `shared::discovery::ConsulClient`
- **THEN** 编译成功，类型可正常使用
