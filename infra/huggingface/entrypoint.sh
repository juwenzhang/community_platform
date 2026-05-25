#!/bin/bash
# ============================================================
# Luhanxin Community Platform — HuggingFace Spaces Entrypoint
# 立即启动 supervisord，让 Nginx 第一时间监听 7860
# PG 初始化和 migration 由 supervisord 异步处理
# ============================================================

set -e

echo "============================================"
echo "  Luhanxin Community Platform — Starting"
echo "============================================"

# ── 仅做 PostgreSQL 数据目录初始化（不启动 PG）──
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "📦 Initializing PostgreSQL data directory..."
    initdb -D "$PGDATA" --auth=trust --username="${POSTGRES_USER:-luhanxin}" --encoding=UTF8 --locale=C > /dev/null
    cp /app/config/pg_hba.conf "$PGDATA/pg_hba.conf"
    echo "✅ PostgreSQL initialized"
else
    echo "✅ PostgreSQL data directory exists"
fi

echo ""
echo "🚀 Starting all services via Supervisord..."
echo "   Migration will run async after PG is ready"
echo ""
echo "============================================"

exec supervisord -c /app/config/supervisord.conf
