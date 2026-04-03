use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

/// 构建 CORS 中间件层
///
/// 从环境变量 `CORS_ALLOWED_ORIGINS` 读取允许的源（逗号分隔）。
/// 默认值为本地开发端口：`http://localhost:5173,http://localhost:5174,http://localhost:5175`。
/// 同时允许 gRPC-Web 所需的 headers，包括 grpc-status/grpc-message 等。
pub fn cors_layer() -> CorsLayer {
    let origins_str = std::env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| {
        "http://localhost:5173,http://localhost:5174,http://localhost:5175".to_string()
    });

    let origins: Vec<_> = origins_str
        .split(',')
        .map(|s| {
            s.trim()
                .parse()
                .unwrap_or_else(|_| panic!("Invalid CORS origin: '{}'", s.trim()))
        })
        .collect();

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods(AllowMethods::any())
        .allow_headers(AllowHeaders::any())
        .expose_headers(tower_http::cors::ExposeHeaders::list([
            "grpc-status".parse().unwrap(),
            "grpc-message".parse().unwrap(),
            "grpc-encoding".parse().unwrap(),
            "grpc-accept-encoding".parse().unwrap(),
        ]))
        .max_age(std::time::Duration::from_secs(86400))
}
