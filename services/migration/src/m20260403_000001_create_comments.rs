use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 comments 表
        manager
            .create_table(
                Table::create()
                    .table(Comments::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Comments::Id).uuid().not_null().primary_key().default(Expr::cust("gen_random_uuid()")))
                    .col(ColumnDef::new(Comments::ArticleId).uuid().not_null())
                    .col(ColumnDef::new(Comments::AuthorId).uuid().not_null())
                    .col(ColumnDef::new(Comments::Content).text().not_null())
                    .col(ColumnDef::new(Comments::ParentId).uuid().null())
                    .col(ColumnDef::new(Comments::ReplyToId).uuid().null())
                    .col(ColumnDef::new(Comments::Mentions).array(ColumnType::Text).not_null().default(Expr::cust("'{}'::text[]")))
                    .col(ColumnDef::new(Comments::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Comments::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .foreign_key(ForeignKey::create().from(Comments::Table, Comments::ArticleId).to(Articles::Table, Articles::Id).on_delete(ForeignKeyAction::Cascade))
                    .foreign_key(ForeignKey::create().from(Comments::Table, Comments::AuthorId).to(Users::Table, Users::Id).on_delete(ForeignKeyAction::NoAction))
                    .foreign_key(ForeignKey::create().from(Comments::Table, Comments::ParentId).to(Comments::Table, Comments::Id).on_delete(ForeignKeyAction::Cascade))
                    .foreign_key(ForeignKey::create().from(Comments::Table, Comments::ReplyToId).to(Comments::Table, Comments::Id).on_delete(ForeignKeyAction::SetNull))
                    .to_owned(),
            )
            .await?;

        // 索引：按文章查评论
        manager
            .create_index(
                Index::create()
                    .name("idx_comments_article_created")
                    .table(Comments::Table)
                    .col(Comments::ArticleId)
                    .col(Comments::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // 索引：按 parent_id 查子回复
        manager
            .create_index(
                Index::create()
                    .name("idx_comments_parent")
                    .table(Comments::Table)
                    .col(Comments::ParentId)
                    .col(Comments::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Comments::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
enum Comments {
    Table,
    Id,
    ArticleId,
    AuthorId,
    Content,
    ParentId,
    ReplyToId,
    Mentions,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Articles {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}
