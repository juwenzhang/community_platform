# svc-user — User Microservice

> English | [中文](./README.md)

gRPC microservice handling user registration, authentication, and profile management.

## Responsibilities

- User registration (bcrypt password hashing)
- User login (JWT issuance)
- User info queries (by ID / by username)
- User listing (search + pagination)
- Profile updates (display_name, avatar_url, bio, social_links, etc.)
- Get current authenticated user

## RPC Methods

| Method | Auth | Description |
|--------|:----:|-------------|
| `Register` | Public | User registration |
| `Login` | Public | User login |
| `GetUser` | Public | Get user by ID |
| `GetUserByUsername` | Public | Get user by username |
| `ListUsers` | Public | User list (search + pagination) |
| `GetCurrentUser` | Required | Get current logged-in user |
| `UpdateProfile` | Required | Update user profile |

## Port

| Port | Protocol | Description |
|------|----------|-------------|
| 50051 | gRPC | UserService |

## Run

```bash
cd services && RUST_LOG=svc_user=info cargo watch -q -x 'run --bin svc-user'
```

## Database Tables

- `users` — User information (id, username, email, password_hash, display_name, avatar_url, bio, company, location, website, social_links, created_at, updated_at)

## Dependencies

`tonic`, `sea-orm`, `bcrypt`, `jsonwebtoken` (via shared), `prost`, `chrono`, `uuid`
