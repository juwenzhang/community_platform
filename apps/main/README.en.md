# Main App — `apps/main/`

> English | [中文](./README.md)

The **Garfish host application** for Luhanxin Community Platform, built with React 18 + Vite + Ant Design.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 18 |
| Build | Vite 6 |
| Micro-frontend | Garfish (Host) |
| Routing | React Router v7 |
| State | Zustand 5 |
| UI | Ant Design 5.x + @ant-design/icons |
| Styling | Tailwind CSS 3.4 + CSS Modules (Less) |
| RPC | @connectrpc/connect-web + protobuf-es |
| Markdown | react-markdown + rehype-highlight |

## Port

| Port | Description |
|------|-------------|
| 5173 | Dev Server |
| 4173 | Preview Server |

## Run

```bash
pnpm dev:main
# → http://localhost:5173
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GIPHY_API_KEY` | GIPHY API Key (GIF/Sticker picker) |

Configure in `.env.local` (gitignored).

## API Proxy

Vite dev server proxies these paths to Gateway (:8000):

- `/luhanxin.community.v1.*` → gRPC-Web requests
- `/api/*` → REST endpoints (upload signing, etc.)
