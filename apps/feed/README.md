# Feed 子应用 — `apps/feed/`

Luhanxin Community Platform 的 **内容动态流子应用**，作为 Garfish 子应用运行，也支持独立启动调试。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 |
| 构建 | Vite 6 |
| 微前端 | Garfish (子应用) |
| UI 组件 | Ant Design 5.x |
| 类型 | TypeScript 5.6 |

## 目录结构

```
apps/feed/
├── index.html          # HTML 入口 (独立运行模式)
├── package.json        # 依赖配置
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 配置 (Garfish 子应用模式)
└── src/
    ├── main.tsx        # 入口 (Garfish 导出 + 独立模式)
    └── FeedApp.tsx     # 子应用骨架页面
```

## 运行模式

### 模式 1: 作为 Garfish 子应用（生产模式）

由主应用 (`apps/main`) 通过 Garfish 加载，挂载到 `#garfish-container-feed` 容器中。

```
主应用 (localhost:5173/feed/*) → Garfish 加载 → Feed (localhost:5174)
```

### 模式 2: 独立运行（开发调试）

直接启动，不依赖主应用框架，方便独立开发和调试。

```bash
pnpm --filter @luhanxin/feed dev
# → http://localhost:5174
```

## 快速启动

```bash
# 独立运行
pnpm --filter @luhanxin/feed dev

# 或使用快捷命令
pnpm dev:feed
```

启动后访问：**http://localhost:5174/**

## 开发命令

```bash
# 启动开发服务器
pnpm --filter @luhanxin/feed dev

# 构建
pnpm --filter @luhanxin/feed build

# 预览
pnpm --filter @luhanxin/feed preview

# 类型检查
cd apps/feed && npx tsc --noEmit
```

## Garfish 子应用导出

`src/main.tsx` 导出了 Garfish 生命周期函数：

```typescript
// Garfish 子应用导出
export const provider = () => ({
  render({ dom }) {
    const container = dom.querySelector('#root') || dom;
    const root = createRoot(container);
    root.render(<FeedApp />);
    return { root };
  },
  destroy({ root }) {
    root.unmount();
  },
});
```

## Vite 配置要点

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5174,
    cors: true,  // Garfish 跨域加载需要
  },
  build: {
    // Garfish 子应用需要 UMD 格式
    lib: {
      entry: './src/main.tsx',
      formats: ['umd'],
      name: 'feed',
    },
  },
});
```

## 调试

### 独立模式调试

1. `pnpm dev:feed` 启动
2. 访问 `http://localhost:5174`
3. 使用浏览器 DevTools 调试

### 在主应用中调试

1. 同时启动主应用和 Feed 子应用
2. 访问 `http://localhost:5173/feed`
3. Garfish 会自动加载 Feed 子应用
4. 在 DevTools 中可以看到子应用的网络请求和日志

### 常见问题

**Q: 子应用加载白屏？**
- 检查 Feed 的 dev server 是否在 :5174 运行
- 检查浏览器 Console 是否有 CORS 错误
- 确认 `vite.config.ts` 中 `server.cors: true`

**Q: 样式冲突？**
- Garfish 默认启用样式沙箱
- 避免使用全局样式，优先用 CSS Modules 或 Tailwind 的 scoped 类名
