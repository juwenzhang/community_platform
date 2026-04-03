pub use sea_orm_migration::prelude::*;

mod m20260329_000001_create_users;
mod m20260329_000002_create_articles;
mod m20260330_000001_add_user_social_fields;
mod m20260402_000001_enable_pg_trgm;
mod m20260402_000002_add_article_category;
mod m20260402_000003_category_to_categories;
mod m20260403_000001_create_comments;
mod m20260403_000002_create_likes;
mod m20260403_000003_create_favorites;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260329_000001_create_users::Migration),
            Box::new(m20260329_000002_create_articles::Migration),
            Box::new(m20260330_000001_add_user_social_fields::Migration),
            Box::new(m20260402_000001_enable_pg_trgm::Migration),
            Box::new(m20260402_000002_add_article_category::Migration),
            Box::new(m20260402_000003_category_to_categories::Migration),
            Box::new(m20260403_000001_create_comments::Migration),
            Box::new(m20260403_000002_create_likes::Migration),
            Box::new(m20260403_000003_create_favorites::Migration),
        ]
    }
}
