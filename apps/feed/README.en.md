# Feed Sub-app — `apps/feed/`

> English | [中文](./README.md)

The **content feed sub-application** for Luhanxin Community Platform, runs as a Garfish sub-app or standalone.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 18 |
| Build | Vite 6 |
| Micro-frontend | Garfish (sub-app via `@garfish/bridge-react-v18`) |
| UI | Ant Design 5.x |

## Port

| Port | Description |
|------|-------------|
| 5174 | Dev Server |

## Run Modes

### Mode 1: As Garfish sub-app

Loaded by the main app via Garfish, mounted into the container.

### Mode 2: Standalone

```bash
pnpm dev:feed
# → http://localhost:5174
```

## Sub-app Registration

Uses `garfishSubApp` Vite plugin from `@luhanxin/dev-kit` to auto-register the real port to `.dev-registry.json` on dev server start.
