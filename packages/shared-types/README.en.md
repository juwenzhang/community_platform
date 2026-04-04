# Shared Types — `packages/shared-types/`

> English | [中文](./README.md)

**Protobuf-generated TypeScript type definitions** shared across all frontend apps. This package is the frontend's **Single Source of Truth** — types are auto-generated from `.proto` files via `buf generate`.

```
proto/*.proto  ──buf generate──▶  packages/shared-types/src/proto/  ──export──▶  apps/main, apps/feed ...
```

## Usage

```typescript
import { UserService, User, LoginRequest } from '@luhanxin/shared-types';
import { CommentService } from '@luhanxin/shared-types/proto/luhanxin/community/v1/comment_pb';
```

## Regenerate Types

```bash
make proto  # From project root
```

> ⚠️ Files under `src/proto/` are **auto-generated** — do not edit manually!

## Dependencies

| Package | Purpose |
|---------|---------|
| `@bufbuild/protobuf` | Protobuf runtime (protobuf-es v2) |

No build step required — exports `.ts` source files directly, processed by Vite.
