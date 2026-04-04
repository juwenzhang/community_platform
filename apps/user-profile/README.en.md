# User Profile Sub-app — `apps/user-profile/`

> English | [中文](./README.md)

The **user profile sub-application** for Luhanxin Community Platform, built with Vue 3 + Naive UI, runs as a Garfish sub-app.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Vue 3 |
| Build | Vite 6 |
| Micro-frontend | Garfish (sub-app via `@garfish/bridge-vue-v3`) |
| UI | Naive UI |
| RPC | @connectrpc/connect-web + protobuf-es |
| Markdown | markdown-it |

## Port

| Port | Description |
|------|-------------|
| 5175 | Dev Server |

## Run

```bash
pnpm --filter @luhanxin/user-profile dev
# → http://localhost:5175
```

## Note

This is the only **Vue 3** sub-app in the project, serving as a proof-of-concept for Garfish's multi-framework support. Bridged via `@garfish/bridge-vue-v3`.
