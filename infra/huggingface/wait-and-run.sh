#!/bin/bash
# Wait for database migrations to finish before starting Rust services.

set -e

SERVICE_NAME="$1"
shift

echo "[$SERVICE_NAME] Waiting for migrations to complete..."

for i in $(seq 1 120); do
    if [ -f /app/data/.migration_done ]; then
        echo "[$SERVICE_NAME] Migrations ready, starting: $*"
        exec "$@"
    fi

    if [ -f /app/data/.migration_failed ]; then
        echo "[$SERVICE_NAME] Migration failed, refusing to start"
        exit 1
    fi

    sleep 1
done

echo "[$SERVICE_NAME] Timed out waiting for migrations"
exit 1
