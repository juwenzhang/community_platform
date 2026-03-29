## MODIFIED Requirements

### Requirement: 公共依赖版本统一

workspace root 的 `Cargo.toml` SHALL 新增以下依赖：
- **新增**: `sea-orm`（ORM 框架，features: runtime-tokio-rustls, sqlx-postgres）
- **新增**: `sea-orm-migration`（数据库迁移框架）

#### Scenario: 新增依赖可编译

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** `sea-orm`、`sea-orm-migration` 编译成功
