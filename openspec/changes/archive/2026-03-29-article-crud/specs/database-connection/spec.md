## MODIFIED Requirements

### Requirement: svc-content 数据库接入

svc-content SHALL 使用 `shared::database::connect()` 获取数据库连接，复用 `shared::entity::articles` Entity。

和 svc-user 一致的模式：
- `main.rs` 中初始化 DB 连接
- handler 接收 `&DatabaseConnection` 参数
- Entity-to-Proto 转换函数

#### Scenario: svc-content 查询文章

- **WHEN** svc-content 收到 GetArticle 请求
- **THEN** 使用 SeaORM `articles::Entity::find_by_id()` 查询，转换为 Proto Article 返回
