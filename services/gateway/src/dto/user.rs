//! 用户相关 DTO

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::common::timestamp_to_string;

/// 社交链接
#[derive(Serialize, Deserialize, ToSchema)]
pub struct SocialLinkDto {
    /// 平台标识
    pub platform: String,
    /// 链接 URL
    pub url: String,
}

/// 用户信息
#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserDto {
    /// 用户唯一标识
    pub id: String,
    /// 用户名
    pub username: String,
    /// 邮箱地址
    pub email: String,
    /// 显示名称
    pub display_name: String,
    /// 头像 URL
    pub avatar_url: String,
    /// 个人简介
    pub bio: String,
    /// 创建时间
    pub created_at: Option<String>,
    /// 更新时间
    pub updated_at: Option<String>,
    /// 公司/组织
    pub company: String,
    /// 所在地
    pub location: String,
    /// 个人网站
    pub website: String,
    /// 社交链接
    pub social_links: Vec<SocialLinkDto>,
}

/// 获取用户响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetUserDto {
    pub user: Option<UserDto>,
}

/// 认证响应（登录/注册）
#[derive(Serialize, Deserialize, ToSchema)]
pub struct AuthDto {
    /// JWT token
    pub token: String,
    /// 用户信息
    pub user: Option<UserDto>,
}

/// 注册请求
#[derive(Serialize, Deserialize, ToSchema)]
pub struct RegisterDto {
    /// 用户名（3-20字符，字母/数字/下划线/连字符）
    pub username: String,
    /// 邮箱地址
    pub email: String,
    /// 密码（8-72字符，至少包含字母和数字）
    pub password: String,
}

/// 登录请求
#[derive(Serialize, Deserialize, ToSchema)]
pub struct LoginDto {
    /// 用户名
    pub username: String,
    /// 密码
    pub password: String,
}

/// 更新资料请求（全量覆盖）
#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateProfileDto {
    /// 显示名称
    #[serde(default)]
    pub display_name: String,
    /// 头像 URL
    #[serde(default)]
    pub avatar_url: String,
    /// 个人简介
    #[serde(default)]
    pub bio: String,
    /// 公司/组织
    #[serde(default)]
    pub company: String,
    /// 所在地
    #[serde(default)]
    pub location: String,
    /// 个人网站
    #[serde(default)]
    pub website: String,
    /// 社交链接
    #[serde(default)]
    pub social_links: Vec<SocialLinkDto>,
}

/// 用户列表响应
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ListUsersDto {
    pub users: Vec<UserDto>,
    pub next_page_token: String,
    pub total_count: i32,
}

/// 用户列表查询参数
#[derive(Deserialize, ToSchema)]
pub struct ListUsersQuery {
    /// 搜索关键词
    #[serde(default)]
    pub query: String,
    /// 每页大小（默认 20，最大 100）
    #[serde(default = "default_page_size")]
    pub page_size: i32,
    /// 分页游标
    #[serde(default)]
    pub page_token: String,
}

fn default_page_size() -> i32 {
    shared::constants::DEFAULT_PAGE_SIZE
}

/// Proto User → UserDto 转换
pub fn user_to_dto(user: shared::proto::User) -> UserDto {
    UserDto {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        created_at: user.created_at.as_ref().map(timestamp_to_string),
        updated_at: user.updated_at.as_ref().map(timestamp_to_string),
        company: user.company,
        location: user.location,
        website: user.website,
        social_links: user
            .social_links
            .into_iter()
            .map(|l| SocialLinkDto {
                platform: l.platform,
                url: l.url,
            })
            .collect(),
    }
}
