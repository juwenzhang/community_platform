# migration — Database Migrations

> English | [中文](./README.md)

PostgreSQL database migration management using SeaORM Migration.

## Tables

| Table | Description |
|-------|-------------|
| `users` | User information |
| `articles` | Article content |
| `comments` | Comments (two-level nested) |
| `likes` | Likes (composite PK) |
| `favorites` | Favorites (composite PK) |

## Commands

```bash
make db-migrate          # Run migrations (up)
make db-migrate-down     # Rollback last migration
make db-migrate-status   # View migration status
make db-migrate-fresh    # Recreate database (drop + re-migrate)
make db-entity           # Generate SeaORM entities from DB
make db-reset            # Full reset (drop + create + migrate)
```

## Adding a Migration

```bash
cd services
sea-orm-cli migrate generate <migration_name>
# Edit the generated file
make db-migrate
```

## Dependencies

`sea-orm-migration`, `tokio`
