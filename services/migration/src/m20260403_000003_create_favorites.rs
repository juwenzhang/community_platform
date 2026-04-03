use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 favorites 表（复合主键）
        manager
            .create_table(
                Table::create()
                    .table(Favorites::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Favorites::UserId).uuid().not_null())
                    .col(ColumnDef::new(Favorites::ArticleId).uuid().not_null())
                    .col(ColumnDef::new(Favorites::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .primary_key(Index::create().col(Favorites::UserId).col(Favorites::ArticleId))
                    .foreign_key(ForeignKey::create().from(Favorites::Table, Favorites::UserId).to(Users::Table, Users::Id).on_delete(ForeignKeyAction::Cascade))
                    .foreign_key(ForeignKey::create().from(Favorites::Table, Favorites::ArticleId).to(Articles::Table, Articles::Id).on_delete(ForeignKeyAction::Cascade))
                    .to_owned(),
            )
            .await?;

        // 索引：按文章查收藏数
        manager
            .create_index(
                Index::create()
                    .name("idx_favorites_article")
                    .table(Favorites::Table)
                    .col(Favorites::ArticleId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Favorites::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
enum Favorites {
    Table,
    UserId,
    ArticleId,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Articles {
    Table,
    Id,
}
