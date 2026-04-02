use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 启用 pg_trgm 扩展（PostgreSQL 内置，无需额外安装）
        db.execute_unprepared("CREATE EXTENSION IF NOT EXISTS pg_trgm")
            .await?;

        // 创建 GIN trigram 索引 — 加速 ILIKE 和 similarity() 查询
        db.execute_unprepared(
            "CREATE INDEX idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX idx_articles_content_trgm ON articles USING gin (content gin_trgm_ops)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared("DROP INDEX IF EXISTS idx_articles_content_trgm")
            .await?;
        db.execute_unprepared("DROP INDEX IF EXISTS idx_articles_title_trgm")
            .await?;
        db.execute_unprepared("DROP EXTENSION IF EXISTS pg_trgm")
            .await?;

        Ok(())
    }
}
