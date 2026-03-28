use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

/// 构建 CORS 中间件层
///
/// 允许 gRPC-Web 所需的 headers，包括 grpc-status/grpc-message 等。
pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::any())
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
