//! Gateway RPC 拦截器模块
//!
//! 定义 PreInterceptor / PostInterceptor trait 和 InterceptorPipeline，
//! 用于在 gRPC 调用前后插入横切逻辑（认证、限流、日志、重试等）。

pub mod auth;
pub mod log;
pub mod retry;

use std::collections::HashMap;
use std::time::Instant;

use tonic::metadata::MetadataMap;
use tonic::Status;

/// RPC 拦截上下文
///
/// 在前置/后置拦截器间传递，携带请求元信息和拦截器间共享数据。
pub struct RpcContext {
    /// 服务名，如 "user"
    pub service: String,
    /// 方法名，如 "get_user"
    pub method: String,
    /// 请求开始时间（用于耗时统计）
    pub start_time: Instant,
    /// 拦截器间传递数据（如 auth 拦截器设置 user_id，后续拦截器读取）
    #[allow(dead_code)]
    pub attrs: HashMap<String, String>,
}

impl RpcContext {
    pub fn new(service: &str, method: &str) -> Self {
        Self {
            service: service.to_string(),
            method: method.to_string(),
            start_time: Instant::now(),
            attrs: HashMap::new(),
        }
    }

    /// 请求耗时（毫秒）
    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }
}

/// 前置拦截器：在 RPC 调用前执行，操作 tonic MetadataMap
///
/// 返回 `Err(Status)` 时短路，不调用下游 RPC。
#[tonic::async_trait]
pub trait PreInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status>;
}

/// 后置拦截器：在 RPC 调用后执行
///
/// `result` 为下游 RPC 调用的结果（Ok/Err）。
/// 后置拦截器失败不短路，仅记录日志。
#[tonic::async_trait]
pub trait PostInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status>;
}

/// 拦截器管道
///
/// 组合多个前置/后置拦截器，按添加顺序依次执行。
/// 通过 `Arc` 共享，可被多个 gRPC Service 实现复用。
pub struct InterceptorPipeline {
    pre: Vec<Box<dyn PreInterceptor>>,
    post: Vec<Box<dyn PostInterceptor>>,
}

impl InterceptorPipeline {
    pub fn new() -> Self {
        Self {
            pre: Vec::new(),
            post: Vec::new(),
        }
    }

    /// 添加前置拦截器
    pub fn add_pre(mut self, interceptor: impl PreInterceptor + 'static) -> Self {
        self.pre.push(Box::new(interceptor));
        self
    }

    /// 添加后置拦截器
    pub fn add_post(mut self, interceptor: impl PostInterceptor + 'static) -> Self {
        self.post.push(Box::new(interceptor));
        self
    }

    /// 执行前置拦截器链
    ///
    /// 任一拦截器返回 Err 则短路，后续拦截器不再执行。
    pub async fn run_pre(
        &self,
        ctx: &mut RpcContext,
        metadata: &MetadataMap,
    ) -> Result<(), Status> {
        for interceptor in &self.pre {
            interceptor.intercept(ctx, metadata).await?;
        }
        Ok(())
    }

    /// 执行后置拦截器链
    ///
    /// 后置拦截器失败不短路，仅记录 error 日志，继续执行后续拦截器。
    pub async fn run_post(
        &self,
        ctx: &RpcContext,
        result: &Result<(), Status>,
    ) -> Result<(), Status> {
        for interceptor in &self.post {
            if let Err(e) = interceptor.intercept(ctx, result).await {
                tracing::error!(
                    service = %ctx.service,
                    method = %ctx.method,
                    error = %e,
                    "Post interceptor failed, continuing..."
                );
            }
        }
        Ok(())
    }
}

impl Default for InterceptorPipeline {
    fn default() -> Self {
        Self::new()
    }
}
