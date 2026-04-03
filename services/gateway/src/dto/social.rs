//! 社交互动相关 DTO

use serde::Serialize;
use utoipa::ToSchema;

/// 文章互动状态
#[derive(Serialize, ToSchema)]
pub struct InteractionDto {
    pub liked: bool,
    pub favorited: bool,
    pub like_count: i32,
    pub favorite_count: i32,
}

/// 点赞响应
#[derive(Serialize, ToSchema)]
pub struct LikeResponseDto {
    pub like_count: i32,
}

/// 收藏响应
#[derive(Serialize, ToSchema)]
pub struct FavoriteResponseDto {
    pub favorite_count: i32,
}
