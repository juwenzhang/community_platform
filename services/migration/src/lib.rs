pub use sea_orm_migration::prelude::*;

mod m20260329_000001_create_users;
mod m20260329_000002_create_articles;
mod m20260330_000001_add_user_social_fields;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260329_000001_create_users::Migration),
            Box::new(m20260329_000002_create_articles::Migration),
            Box::new(m20260330_000001_add_user_social_fields::Migration),
        ]
    }
}
