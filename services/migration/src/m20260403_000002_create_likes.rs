use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 likes 表（复合主键）
        manager
            .create_table(
                Table::create()
                    .table(Likes::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Likes::UserId).uuid().not_null())
                    .col(ColumnDef::new(Likes::ArticleId).uuid().not_null())
                    .col(ColumnDef::new(Likes::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .primary_key(Index::create().col(Likes::UserId).col(Likes::ArticleId))
                    .foreign_key(ForeignKey::create().from(Likes::Table, Likes::UserId).to(Users::Table, Users::Id).on_delete(ForeignKeyAction::Cascade))
                    .foreign_key(ForeignKey::create().from(Likes::Table, Likes::ArticleId).to(Articles::Table, Articles::Id).on_delete(ForeignKeyAction::Cascade))
                    .to_owned(),
            )
            .await?;

        // 索引：按文章查点赞数
        manager
            .create_index(
                Index::create()
                    .name("idx_likes_article")
                    .table(Likes::Table)
                    .col(Likes::ArticleId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Likes::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
enum Likes {
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
