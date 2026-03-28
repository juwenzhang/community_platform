use thiserror::Error;
use tonic::Status;

/// svc-user 服务级错误
#[derive(Error, Debug)]
pub enum SvcUserError {
    #[error("用户未找到: {0}")]
    NotFound(String),

    #[error("内部错误: {0}")]
    Internal(String),
}

impl From<SvcUserError> for Status {
    fn from(err: SvcUserError) -> Self {
        match err {
            SvcUserError::NotFound(msg) => Status::not_found(msg),
            SvcUserError::Internal(msg) => Status::internal(msg),
        }
    }
}
