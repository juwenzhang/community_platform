use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 新增 company 列
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(string_len(Users::Company, 100).default(""))
                    .to_owned(),
            )
            .await?;

        // 新增 location 列
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(string_len(Users::Location, 100).default(""))
                    .to_owned(),
            )
            .await?;

        // 新增 website 列
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(string_len(Users::Website, 255).default(""))
                    .to_owned(),
            )
            .await?;

        // 新增 social_links JSONB 列
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column(
                        ColumnDef::new(Users::SocialLinks)
                            .json_binary()
                            .default("[]")
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::SocialLinks)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::Website)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::Location)
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::Company)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
pub enum Users {
    Table,
    Company,
    Location,
    Website,
    SocialLinks,
}
