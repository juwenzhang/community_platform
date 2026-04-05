use tonic::Status;

/// 平台公共错误类型
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Invalid argument: {0}")]
    InvalidArgument(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Service unavailable: {0}")]
    Unavailable(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

impl From<AppError> for Status {
    fn from(err: AppError) -> Self {
        match err {
            AppError::NotFound(msg) => Status::not_found(msg),
            AppError::InvalidArgument(msg) => Status::invalid_argument(msg),
            AppError::Unauthorized(msg) => Status::unauthenticated(msg),
            AppError::PermissionDenied(msg) => Status::permission_denied(msg),
            AppError::Internal(msg) => Status::internal(msg),
            AppError::Unavailable(msg) => Status::unavailable(msg),
            AppError::Config(msg) => Status::internal(msg),
        }
    }
}
