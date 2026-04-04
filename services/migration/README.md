# migration — 数据库迁移

> [English](./README.en.md) | 中文

基于 SeaORM Migration 的 PostgreSQL 数据库迁移管理。

## 数据表

| 表名 | 说明 |
|------|------|
| `users` | 用户信息 |
| `articles` | 文章内容 |
| `comments` | 评论（二级嵌套） |
| `likes` | 点赞（复合主键） |
| `favorites` | 收藏（复合主键） |

## 常用命令

```bash
# 运行迁移（向上）
make db-migrate

# 回滚最近一次
make db-migrate-down

# 查看状态
make db-migrate-status

# 重建数据库（drop + re-migrate）
make db-migrate-fresh

# 从数据库生成 SeaORM Entity
make db-entity

# 完全重置（drop + create + migrate）
make db-reset
```

## 新增迁移

```bash
cd services
sea-orm-cli migrate generate <migration_name>
# 编辑生成的文件
make db-migrate
```

## 依赖

`sea-orm-migration`, `tokio`
