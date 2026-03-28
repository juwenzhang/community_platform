//! 重试 Worker
//!
//! 后台任务：订阅 NATS 重试队列，消费失败的请求并重新执行。
//! 使用指数退避（1s → 2s → 4s），最大重试 3 次后进死信队列。

pub mod retry_worker;
