use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 notifications 表
        manager
            .create_table(
                Table::create()
                    .table(Notifications::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Notifications::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Notifications::UserId).uuid().not_null())
                    .col(ColumnDef::new(Notifications::Type).string_len(50).not_null())
                    .col(ColumnDef::new(Notifications::ActorId).uuid().not_null())
                    .col(ColumnDef::new(Notifications::TargetType).string_len(50).not_null())
                    .col(ColumnDef::new(Notifications::TargetId).uuid().not_null())
                    .col(ColumnDef::new(Notifications::IsRead).boolean().not_null().default(false))
                    .col(ColumnDef::new(Notifications::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .foreign_key(ForeignKey::create().from(Notifications::Table, Notifications::UserId).to(Users::Table, Users::Id).on_delete(ForeignKeyAction::Cascade))
                    .foreign_key(ForeignKey::create().from(Notifications::Table, Notifications::ActorId).to(Users::Table, Users::Id).on_delete(ForeignKeyAction::Cascade))
                    .to_owned(),
            )
            .await?;

        // 索引：按用户查未读通知（核心查询路径）
        manager
            .create_index(
                Index::create()
                    .name("idx_notifications_user_unread")
                    .table(Notifications::Table)
                    .col(Notifications::UserId)
                    .col(Notifications::IsRead)
                    .col(Notifications::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // 索引：去重（同一 actor + target + type 组合）
        manager
            .create_index(
                Index::create()
                    .name("idx_notifications_dedup")
                    .table(Notifications::Table)
                    .col(Notifications::ActorId)
                    .col(Notifications::TargetId)
                    .col(Notifications::Type)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Notifications::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Notifications {
    Table,
    Id,
    UserId,
    Type,
    ActorId,
    TargetType,
    TargetId,
    IsRead,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}
