# svc-content — Content Microservice

> English | [中文](./README.md)

gRPC microservice handling articles, comments, and social interactions (likes/favorites).

## Responsibilities

- **Article CRUD**: Create/edit/delete/list/detail (Markdown content)
- **Comment System**: Two-level nested comments + @mention parsing + emoji (Unicode)
- **Social Interactions**: Like/unlike, favorite/unfavorite, interaction status queries
- **Article Sorting**: Recommended (view_count + like_count*3 weighted) / Latest (time-ordered)
- **NATS Event Publishing**: Publishes events after comment, like, favorite actions

## RPC Methods

### ArticleService

| Method | Auth | Description |
|--------|:----:|-------------|
| `GetArticle` | Public | Get article detail |
| `ListArticles` | Public | Article list (filter + sort + pagination) |
| `CreateArticle` | Required | Create article |
| `UpdateArticle` | Required | Update article (author only) |
| `DeleteArticle` | Required | Soft-delete article (author only) |

### CommentService

| Method | Auth | Description |
|--------|:----:|-------------|
| `CreateComment` | Required | Create comment/reply |
| `ListComments` | Public | List article comments (nested) |
| `DeleteComment` | Required | Delete comment (author only) |

### SocialService

| Method | Auth | Description |
|--------|:----:|-------------|
| `LikeArticle` / `UnlikeArticle` | Required | Toggle like |
| `FavoriteArticle` / `UnfavoriteArticle` | Required | Toggle favorite |
| `GetArticleInteraction` | Required | Get interaction status |
| `ListFavorites` | Required | List favorites |

## Port

| Port | Protocol | Description |
|------|----------|-------------|
| 50052 | gRPC | ArticleService + CommentService + SocialService |

## Run

```bash
cd services && RUST_LOG=svc_content=info cargo watch -q -x 'run --bin svc-content'
```

## Database Tables

- `articles` — Articles (id, title, slug, summary, content, author_id, tags, view_count, like_count, status, categories, ...)
- `comments` — Comments (id, article_id, author_id, content, parent_id, reply_to_id, mentions, ...)
- `likes` — Likes (user_id + article_id composite PK)
- `favorites` — Favorites (user_id + article_id composite PK)

## Dependencies

`tonic`, `sea-orm`, `regex` (@mention parsing), `async-nats`, `prost`, `chrono`, `uuid`
