## MODIFIED Requirements

### Requirement: 公共依赖版本统一

workspace root 的 `Cargo.toml` SHALL 使用 `[workspace.dependencies]` 统一管理公共依赖版本，包括：
- `tokio`（async runtime）
- `serde` + `serde_json`
- `tracing` + `tracing-subscriber`
- `prost` + `tonic`
- `axum` + `tower` + `tower-http`
- **新增**: `async-nats`（NATS 客户端）
- **新增**: `reqwest`（HTTP 客户端，用于 Consul API 调用）
- **新增**: `uuid`（事件 ID 生成）

#### Scenario: 依赖版本一致

- **WHEN** 查看 `gateway/Cargo.toml` 和 `svc-user/Cargo.toml` 中的依赖声明
- **THEN** 均使用 `dependency.workspace = true` 引用 workspace 级别的版本

#### Scenario: 新增依赖可编译

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** `async-nats`、`reqwest`、`uuid` 等新增依赖编译成功
