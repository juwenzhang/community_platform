use sea_orm_migration::{prelude::*, schema::*};

use super::m20260329_000001_create_users::Users;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Articles::Table)
                    .if_not_exists()
                    .col(pk_uuid(Articles::Id))
                    .col(string_len(Articles::Title, 255))
                    .col(string_len_uniq(Articles::Slug, 255))
                    .col(text(Articles::Summary).default(""))
                    .col(text(Articles::Content).default(""))
                    .col(uuid(Articles::AuthorId))
                    .col(
                        array(Articles::Tags, ColumnType::Text)
                            .default(Expr::val("{}").cast_as(Alias::new("text[]"))),
                    )
                    .col(integer(Articles::ViewCount).default(0))
                    .col(integer(Articles::LikeCount).default(0))
                    .col(small_integer(Articles::Status).default(0))
                    .col(
                        timestamp_with_time_zone(Articles::CreatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        timestamp_with_time_zone(Articles::UpdatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .col(timestamp_with_time_zone_null(Articles::PublishedAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_articles_author")
                            .from(Articles::Table, Articles::AuthorId)
                            .to(Users::Table, Users::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // 索引
        manager
            .create_index(
                Index::create()
                    .name("idx_articles_author")
                    .table(Articles::Table)
                    .col(Articles::AuthorId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_articles_slug")
                    .table(Articles::Table)
                    .col(Articles::Slug)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_articles_status")
                    .table(Articles::Table)
                    .col(Articles::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_articles_created")
                    .table(Articles::Table)
                    .col((Articles::CreatedAt, IndexOrder::Desc))
                    .to_owned(),
            )
            .await?;

        // GIN 索引（支持 tags @> ARRAY['rust'] 查询）
        manager
            .create_index(
                Index::create()
                    .name("idx_articles_tags")
                    .table(Articles::Table)
                    .col(Articles::Tags)
                    .index_type(IndexType::Custom(Alias::new("gin").into_iden()))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Articles::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Articles {
    Table,
    Id,
    Title,
    Slug,
    Summary,
    Content,
    AuthorId,
    Tags,
    ViewCount,
    LikeCount,
    Status,
    CreatedAt,
    UpdatedAt,
    PublishedAt,
}
