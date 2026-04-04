# Feed 子应用 — `apps/feed/`

> [English](./README.en.md) | 中文

Luhanxin Community Platform 的 **内容动态流子应用**，作为 Garfish 子应用运行，也支持独立启动调试。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 |
| 构建 | Vite 6 |
| 微前端 | Garfish (子应用，通过 `@garfish/bridge-react-v18`) |
| UI 组件 | Ant Design 5.x |
| 类型 | TypeScript 5.6 |

## 端口

| 端口 | 说明 |
|------|------|
| 5174 | Dev Server |

## 运行模式

### 模式 1: 作为 Garfish 子应用

由主应用通过 Garfish 加载，挂载到 `#garfish-container` 容器中。

```
主应用 (localhost:5173/feed/*) → Garfish 加载 → Feed (localhost:5174)
```

### 模式 2: 独立运行

```bash
pnpm dev:feed
# → http://localhost:5174
```

## 子应用注册

通过 `@luhanxin/dev-kit` 的 `garfishSubApp` Vite 插件，dev server 启动后自动将真实端口注册到 `.dev-registry.json`，主应用通过该文件发现子应用地址。

## 构建

子应用使用标准应用模式构建（产出 `index.html` + JS/CSS），Garfish 通过 HTML 入口加载。
