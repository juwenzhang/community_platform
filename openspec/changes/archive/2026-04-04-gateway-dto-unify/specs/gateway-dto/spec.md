# Gateway DTO 统一与 BFF 聚合增强

## Overview

统一 Gateway REST 路由的 DTO 定义到 `gateway/src/dto/` 目录，消除跨模块交叉引用和 ApiError 格式不一致问题。同时增强 BFF 聚合，让 ListComments 和 ListFavorites 返回完整的用户信息。

## Capabilities

### DTO 集中管理
- 统一 `ApiError { code: String, message: String }` 格式
- `UserDto`、`ArticleDto`、`CommentDto` 等集中在 `dto/` 目录
- 消除 `super::super::routes::user::UserDto` 交叉引用

### BFF 聚合增强
- ListComments 响应包含评论者的 username、display_name、avatar_url
- ListFavorites 响应包含文章作者信息
