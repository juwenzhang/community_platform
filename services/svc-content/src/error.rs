use thiserror::Error;
use tonic::Status;

/// svc-content 服务级错误
#[derive(Error, Debug)]
pub enum SvcContentError {
    #[error("文章未找到: {0}")]
    NotFound(String),

    #[error("无权限: {0}")]
    PermissionDenied(String),

    #[error("内部错误: {0}")]
    Internal(String),
}

impl From<SvcContentError> for Status {
    fn from(err: SvcContentError) -> Self {
        match err {
            SvcContentError::NotFound(msg) => Status::not_found(msg),
            SvcContentError::PermissionDenied(msg) => Status::permission_denied(msg),
            SvcContentError::Internal(msg) => Status::internal(msg),
        }
    }
}
