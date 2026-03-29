//! 用户认证 handler — 注册 + 登录
//!
//! bcrypt 操作通过 spawn_blocking 执行，避免阻塞 tokio worker thread。

use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use tonic::Status;

use shared::auth::{self, AuthConfig};
use shared::entity::prelude::Users;
use shared::entity::users;

use super::user_model_to_proto;

/// 用户名校验：3-20 字符，字母/数字/下划线/连字符，字母或数字开头
fn validate_username(username: &str) -> Result<(), Status> {
    if username.len() < 3 || username.len() > 20 {
        return Err(Status::invalid_argument(
            "Username must be 3-20 characters",
        ));
    }
    let chars: Vec<char> = username.chars().collect();
    if !chars[0].is_alphanumeric() {
        return Err(Status::invalid_argument(
            "Username must start with a letter or number",
        ));
    }
    if !chars
        .iter()
        .all(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
    {
        return Err(Status::invalid_argument(
            "Username can only contain letters, numbers, underscores, and hyphens",
        ));
    }
    Ok(())
}

/// 密码校验：8-72 字符，至少包含字母和数字
fn validate_password(password: &str) -> Result<(), Status> {
    if password.len() < 8 || password.len() > 72 {
        return Err(Status::invalid_argument(
            "Password must be 8-72 characters",
        ));
    }
    let has_letter = password.chars().any(|c| c.is_alphabetic());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !has_letter || !has_digit {
        return Err(Status::invalid_argument(
            "Password must contain at least one letter and one number",
        ));
    }
    Ok(())
}

/// 邮箱格式校验（简单版）
fn validate_email(email: &str) -> Result<(), Status> {
    if !email.contains('@') || !email.contains('.') || email.len() < 5 {
        return Err(Status::invalid_argument("Invalid email format"));
    }
    Ok(())
}

/// 用户注册
pub async fn register(
    db: &DatabaseConnection,
    username: &str,
    email: &str,
    password: &str,
) -> Result<(shared::proto::User, String), Status> {
    // 1. 输入校验
    validate_username(username)?;
    validate_email(email)?;
    validate_password(password)?;

    // 2. bcrypt hash（CPU 密集，用 spawn_blocking）
    let password_owned = password.to_string();
    let password_hash = tokio::task::spawn_blocking(move || bcrypt::hash(password_owned, 12))
        .await
        .map_err(|_| Status::internal("Hash task failed"))?
        .map_err(|_| Status::internal("Password hash failed"))?;

    // 3. 插入数据库
    let new_user = users::ActiveModel {
        id: Set(uuid::Uuid::new_v4()),
        username: Set(username.to_string()),
        email: Set(email.to_string()),
        password_hash: Set(password_hash),
        display_name: Set(username.to_string()),
        ..Default::default()
    };

    let user_model = new_user.insert(db).await.map_err(|e| {
        let msg = e.to_string();
        if msg.contains("duplicate key") || msg.contains("unique") {
            if msg.contains("username") {
                Status::already_exists(format!("Username '{username}' is already taken"))
            } else if msg.contains("email") {
                Status::already_exists(format!("Email '{email}' is already registered"))
            } else {
                Status::already_exists("Username or email already exists")
            }
        } else {
            tracing::error!(error = %e, "Database insert failed");
            Status::internal("Registration failed")
        }
    })?;

    // 4. 签发 JWT
    let auth_config = AuthConfig::from_env();
    let token = auth::create_token(&user_model.id.to_string(), &auth_config)
        .map_err(|e| Status::internal(format!("Token creation failed: {e}")))?;

    Ok((user_model_to_proto(user_model), token))
}

/// 用户登录
pub async fn login(
    db: &DatabaseConnection,
    username: &str,
    password: &str,
) -> Result<(shared::proto::User, String), Status> {
    // 1. 查询用户（用户名不存在和密码错误返回相同错误，防枚举攻击）
    let user_model = Users::find()
        .filter(users::Column::Username.eq(username))
        .one(db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database query failed");
            Status::internal("Login failed")
        })?
        .ok_or_else(|| Status::unauthenticated("Invalid credentials"))?;

    // 2. bcrypt verify（CPU 密集，用 spawn_blocking）
    let stored_hash = user_model.password_hash.clone();
    let password_owned = password.to_string();
    let is_valid = tokio::task::spawn_blocking(move || bcrypt::verify(password_owned, &stored_hash))
        .await
        .map_err(|_| Status::internal("Verify task failed"))?
        .map_err(|_| Status::internal("Password verification failed"))?;

    if !is_valid {
        return Err(Status::unauthenticated("Invalid credentials"));
    }

    // 3. 签发 JWT
    let auth_config = AuthConfig::from_env();
    let token = auth::create_token(&user_model.id.to_string(), &auth_config)
        .map_err(|e| Status::internal(format!("Token creation failed: {e}")))?;

    Ok((user_model_to_proto(user_model), token))
}
