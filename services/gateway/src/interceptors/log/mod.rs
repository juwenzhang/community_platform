//! 日志拦截器
//!
//! Pre: 记录请求到达
//! Post: 记录请求完成（含耗时和状态）

use tonic::Status;
use tonic::metadata::MetadataMap;
use tracing::info;

use super::{PostInterceptor, PreInterceptor, RpcContext};

/// 日志拦截器（同时实现 Pre 和 Post）
#[derive(Debug, Default)]
pub struct LogInterceptor;

#[tonic::async_trait]
impl PreInterceptor for LogInterceptor {
    async fn intercept(&self, ctx: &mut RpcContext, _metadata: &MetadataMap) -> Result<(), Status> {
        info!(
            service = %ctx.service,
            method = %ctx.method,
            "RPC request received"
        );
        Ok(())
    }
}

#[tonic::async_trait]
impl PostInterceptor for LogInterceptor {
    async fn intercept(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status> {
        let status = match result {
            Ok(()) => "ok".to_string(),
            Err(s) => s.code().to_string(),
        };

        info!(
            service = %ctx.service,
            method = %ctx.method,
            status = %status,
            duration_ms = %ctx.elapsed_ms(),
            "RPC request completed"
        );
        Ok(())
    }
}
