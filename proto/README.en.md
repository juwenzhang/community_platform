# Protobuf Definitions — `proto/`

> English | [中文](./README.md)

**Protocol Buffers definitions** — the **Single Source of Truth** for all frontend-backend API contracts.

## Overview

All API interactions use Protobuf. Code is generated for both Rust and TypeScript via [buf](https://buf.build/).

```
proto/*.proto
    ├── buf generate ──▶ Rust (prost + tonic)     → services/shared/src/proto/
    └── buf generate ──▶ TypeScript (protobuf-es) → packages/shared-types/src/proto/
```

## Proto Files

| File | Service | Description |
|------|---------|-------------|
| `user.proto` | UserService | Registration, login, profile management |
| `article.proto` | ArticleService | Article CRUD, sorting, categories |
| `comment.proto` | CommentService | Comments (nested), @mentions |
| `social.proto` | SocialService | Like/unlike, favorite/unfavorite |
| `common.proto` | — | Pagination types |
| `event.proto` | — | NATS event envelope |

## Commands

```bash
make proto          # Generate Rust + TypeScript code
make proto-lint     # Lint proto files
make proto-breaking # Detect breaking changes
```

> **Important**: Always use `make proto` instead of `buf generate` directly — it also runs `gen-proto-mod.sh` to generate the Rust `mod.rs` module structure.

## Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Package | `lowercase.dot.separated` | `luhanxin.community.v1` |
| Service | `PascalCaseService` | `UserService` |
| RPC Method | `PascalCase` | `GetUser` |
| Message | `PascalCase` | `GetUserRequest` |
| Field | `snake_case` | `user_id` |
| Enum | `PascalCase` | `ArticleStatus` |
| Enum Value | `SCREAMING_SNAKE_CASE` | `ARTICLE_STATUS_DRAFT` |
| Enum Zero | `*_UNSPECIFIED` | `ARTICLE_STATUS_UNSPECIFIED` |

## Prerequisites

```bash
brew install bufbuild/buf/buf
cargo install protoc-gen-prost protoc-gen-tonic
```
