use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 新增 category 列（smallint，默认 0 = UNSPECIFIED）
        manager
            .alter_table(
                Table::alter()
                    .table(Articles::Table)
                    .add_column(small_integer(Articles::Category).default(0))
                    .to_owned(),
            )
            .await?;

        // 索引：按分类查询
        manager
            .create_index(
                Index::create()
                    .name("idx_articles_category")
                    .table(Articles::Table)
                    .col(Articles::Category)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_articles_category")
                    .table(Articles::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Articles::Table)
                    .drop_column(Articles::Category)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Articles {
    Table,
    Category,
}
