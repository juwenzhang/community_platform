# Docker 基础设施 — `docker/`

Luhanxin Community Platform 的 **本地开发环境基础设施**，包含数据库和搜索引擎。

## 服务列表

| 服务 | 镜像 | 容器名 | 端口 | 用途 |
|------|------|--------|------|------|
| PostgreSQL | `postgres:16-alpine` | `luhanxin-postgres` | 5432 | 主数据库 |
| Redis | `redis:7-alpine` | `luhanxin-redis` | 6379 | 缓存 + 消息队列 |
| Meilisearch | `getmeili/meilisearch:latest` | `luhanxin-meilisearch` | 7700 | 全文搜索 |

## 快速启动

### 1. 配置环境变量

```bash
# 首次使用，从模板创建 .env
cp docker/.env.example docker/.env

# 按需修改 docker/.env (默认值即可用于开发)
```

### 2. 启动所有服务

```bash
# 方式一: Makefile (推荐)
make dev-infra

# 方式二: 直接 docker compose
cd docker && docker compose up -d
```

### 3. 停止服务

```bash
# Makefile
make dev-infra-down

# 或
cd docker && docker compose down
```

## 常用命令

```bash
# 启动
cd docker && docker compose up -d

# 停止 (保留数据)
cd docker && docker compose down

# 停止并删除数据卷 (⚠️ 数据丢失)
cd docker && docker compose down -v

# 查看状态
cd docker && docker compose ps

# 查看日志 (实时)
cd docker && docker compose logs -f

# 查看特定服务日志
cd docker && docker compose logs -f postgres
cd docker && docker compose logs -f redis
cd docker && docker compose logs -f meilisearch

# 重启单个服务
cd docker && docker compose restart postgres
```

## 连接信息

### PostgreSQL

```bash
# 连接字符串
postgresql://luhanxin:luhanxin_dev_2024@localhost:5432/luhanxin_community

# psql 连接
psql -h localhost -U luhanxin -d luhanxin_community
# 密码: luhanxin_dev_2024

# 或使用 docker exec
docker exec -it luhanxin-postgres psql -U luhanxin -d luhanxin_community
```

### Redis

```bash
# 连接字符串
redis://:redis_dev_2024@localhost:6379

# redis-cli 连接
redis-cli -h localhost -p 6379 -a redis_dev_2024

# 或使用 docker exec
docker exec -it luhanxin-redis redis-cli -a redis_dev_2024

# 基本操作
> PING        # → PONG
> INFO server  # 服务器信息
> KEYS luhanxin:*  # 查看项目相关 key
```

### Meilisearch

```bash
# 管理面板
open http://localhost:7700

# API 健康检查
curl http://localhost:7700/health
# → {"status":"available"}

# API 密钥
# Master Key: meili_dev_master_key_2024

# 查看索引
curl -H "Authorization: Bearer meili_dev_master_key_2024" http://localhost:7700/indexes
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` | `luhanxin` | PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | `luhanxin_dev_2024` | PostgreSQL 密码 |
| `POSTGRES_DB` | `luhanxin_community` | 数据库名 |
| `POSTGRES_PORT` | `5432` | PostgreSQL 端口 |
| `REDIS_PASSWORD` | `redis_dev_2024` | Redis 密码 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `MEILI_MASTER_KEY` | `meili_dev_master_key_2024` | Meilisearch 主密钥 |
| `MEILI_PORT` | `7700` | Meilisearch 端口 |

## 数据持久化

数据存储在 Docker volumes 中，`docker compose down` 不会丢失数据：

| Volume | 对应服务 |
|--------|---------|
| `luhanxin_postgres_data` | PostgreSQL 数据 |
| `luhanxin_redis_data` | Redis 持久化数据 |
| `luhanxin_meili_data` | Meilisearch 索引数据 |

要完全重置数据：

```bash
cd docker && docker compose down -v
# 这会删除所有数据卷
```

## 健康检查

所有服务都配置了健康检查，可以通过以下方式确认：

```bash
# 查看服务健康状态
docker compose ps
# 应该看到 (healthy) 状态

# 手动检查
docker exec luhanxin-postgres pg_isready -U luhanxin -d luhanxin_community
docker exec luhanxin-redis redis-cli -a redis_dev_2024 ping
curl -s http://localhost:7700/health
```

## 调试

### PostgreSQL 慢查询

```sql
-- 连接到 PostgreSQL 后
-- 查看当前活动连接
SELECT * FROM pg_stat_activity WHERE datname = 'luhanxin_community';

-- 查看表大小
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text))
FROM pg_tables WHERE schemaname = 'public';
```

### Redis 监控

```bash
# 实时监控所有命令
docker exec -it luhanxin-redis redis-cli -a redis_dev_2024 MONITOR

# 查看内存使用
docker exec -it luhanxin-redis redis-cli -a redis_dev_2024 INFO memory

# 查看慢日志
docker exec -it luhanxin-redis redis-cli -a redis_dev_2024 SLOWLOG GET 10
```

### Meilisearch 调试

```bash
# 查看任务状态
curl -H "Authorization: Bearer meili_dev_master_key_2024" \
  http://localhost:7700/tasks

# 查看索引统计
curl -H "Authorization: Bearer meili_dev_master_key_2024" \
  http://localhost:7700/stats
```

## 常见问题

**Q: 端口被占用？**

```bash
# 查看端口占用
lsof -i :5432
lsof -i :6379
lsof -i :7700

# 修改 docker/.env 中的端口配置
```

**Q: 容器启动失败？**

```bash
# 查看详细日志
cd docker && docker compose logs --no-log-prefix postgres

# 清理并重新创建
cd docker && docker compose down -v && docker compose up -d
```
