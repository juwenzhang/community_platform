# User Profile 子应用 — `apps/user-profile/`

> [English](./README.en.md) | 中文

Luhanxin Community Platform 的 **用户主页子应用**，基于 Vue 3 + Naive UI，作为 Garfish 子应用运行。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3 |
| 构建 | Vite 6 |
| 微前端 | Garfish (子应用，通过 `@garfish/bridge-vue-v3`) |
| UI 组件 | Naive UI |
| RPC | @connectrpc/connect-web + protobuf-es |
| Markdown | markdown-it |
| 类型 | TypeScript 5.6 + vue-tsc |

## 端口

| 端口 | 说明 |
|------|------|
| 5175 | Dev Server |

## 启动

```bash
pnpm --filter @luhanxin/user-profile dev
# → http://localhost:5175
```

## 说明

这是项目中唯一使用 **Vue 3** 的子应用，用于验证 Garfish 微前端对多框架的支持能力。通过 `@garfish/bridge-vue-v3` 桥接 Garfish 生命周期。
