#!/bin/bash
# ============================================================
# 等待 PostgreSQL 启动后运行 migration
# 由 supervisord 启动，作为一次性任务
# ============================================================

set -e

echo "[migration] Waiting for PostgreSQL..."

# 等待 PG 就绪（最多 60 秒）
for i in $(seq 1 60); do
    if pg_isready -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER:-luhanxin}" > /dev/null 2>&1; then
        echo "[migration] PostgreSQL is ready"
        break
    fi
    sleep 1
done

# 创建数据库
echo "[migration] Ensuring database '${POSTGRES_DB:-luhanxin_community}' exists..."
psql -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER:-luhanxin}" -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB:-luhanxin_community}'" 2>/dev/null | grep -q 1 \
    || psql -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER:-luhanxin}" -d postgres -c \
    "CREATE DATABASE ${POSTGRES_DB:-luhanxin_community}"

# 运行 migration
echo "[migration] Running migrations..."
rm -f /app/data/.migration_done /app/data/.migration_failed
if /app/bin/migration up; then
    touch /app/data/.migration_done
    echo "[migration] ✅ Done"
    exit 0
else
    touch /app/data/.migration_failed
    echo "[migration] ❌ Failed"
    exit 1
fi
