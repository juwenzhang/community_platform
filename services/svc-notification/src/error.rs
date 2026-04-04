/// svc-notification 服务级错误
#[derive(Debug, thiserror::Error)]
pub enum NotificationError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("Redis error: {0}")]
    Redis(String),
}
