use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // category (smallint) → categories (smallint[])
        // 1. 新增 categories 数组列
        db.execute_unprepared(
            "ALTER TABLE articles ADD COLUMN categories smallint[] NOT NULL DEFAULT '{}'",
        )
        .await?;

        // 2. 迁移旧数据：category != 0 的值放入 categories 数组
        db.execute_unprepared(
            "UPDATE articles SET categories = ARRAY[category] WHERE category != 0",
        )
        .await?;

        // 3. 删除旧 category 列和索引
        db.execute_unprepared("DROP INDEX IF EXISTS idx_articles_category")
            .await?;
        db.execute_unprepared("ALTER TABLE articles DROP COLUMN category")
            .await?;

        // 4. 创建 GIN 索引（支持 categories @> ARRAY[1] 查询）
        db.execute_unprepared(
            "CREATE INDEX idx_articles_categories ON articles USING gin (categories)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared("DROP INDEX IF EXISTS idx_articles_categories")
            .await?;
        db.execute_unprepared(
            "ALTER TABLE articles ADD COLUMN category smallint NOT NULL DEFAULT 0",
        )
        .await?;
        db.execute_unprepared(
            "UPDATE articles SET category = categories[1] WHERE array_length(categories, 1) > 0",
        )
        .await?;
        db.execute_unprepared("ALTER TABLE articles DROP COLUMN categories")
            .await?;
        db.execute_unprepared(
            "CREATE INDEX idx_articles_category ON articles (category)",
        )
        .await?;

        Ok(())
    }
}
