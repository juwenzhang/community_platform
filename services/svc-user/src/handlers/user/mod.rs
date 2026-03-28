use shared::proto::User;

/// 根据 ID 获取用户
///
/// 目前返回 Mock 数据，后续接入数据库后改为真实查询。
pub async fn get_user_by_id(user_id: &str) -> User {
    User {
        id: user_id.to_string(),
        username: "luhanxin".to_string(),
        email: "hi@luhanxin.com".to_string(),
        display_name: "Luhanxin".to_string(),
        avatar_url: "https://blog.luhanxin.com/upload/D1F18B0567B5565BAAF031B586E3B56B.jpg"
            .to_string(),
        bio: "Full-stack developer & community builder".to_string(),
        created_at: Some(prost_types::Timestamp {
            seconds: 1700000000,
            nanos: 0,
        }),
        updated_at: Some(prost_types::Timestamp {
            seconds: 1700000000,
            nanos: 0,
        }),
    }
}
