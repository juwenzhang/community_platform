pub mod article;
pub mod comment;
pub mod social;

/// Repository 层通用错误
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("Entity not found")]
    NotFound,
}
