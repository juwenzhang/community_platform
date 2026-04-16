# Markdown Parser Demo

独立的测试应用，验证 `@luhanxin/md-parser-react` 和 `@luhanxin/md-parser-vue` 包是否正常工作。

## 目录结构

```
demo/
├── react-app/     # React 测试应用
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── vue-app/       # Vue 测试应用
│   ├── src/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 使用方法

### 1. 安装依赖

在项目根目录运行：

```bash
# 安装所有依赖（包括 demo 应用）
pnpm install

# 或者只安装 demo 依赖
cd demo/react-app && pnpm install
cd ../vue-app && pnpm install
```

### 2. 运行 React Demo

```bash
cd demo/react-app
pnpm dev
```

访问 http://localhost:5173

### 3. 运行 Vue Demo

```bash
cd demo/vue-app
pnpm dev
```

访问 http://localhost:5174（或其他可用端口）

## 测试功能

两个 demo 应用都包含以下测试用例：

1. ✅ 基础 Markdown 语法（标题、列表、加粗、斜体）
2. ✅ 代码高亮（Shiki）
3. ✅ Mermaid 图表（动态加载）
4. ✅ Mention 提及（@username）
5. ✅ Hashtag 标签（#tag）
6. ✅ 自定义容器（tip、warning）
7. ✅ 实时编辑预览

## 注意事项

- Demo 应用使用 `workspace:*` 引用本地包，确保先构建核心包
- 如果修改了 `packages/md-parser-*` 代码，需要重新构建：
  ```bash
  pnpm --filter @luhanxin/md-parser-core build
  pnpm --filter @luhanxin/md-parser-react build
  pnpm --filter @luhanxin/md-parser-vue build
  ```
- Demo 应用不会被打包或发布到 NPM

## 清理

```bash
# 删除所有 demo 的 node_modules 和 dist
cd demo/react-app && rm -rf node_modules dist
cd ../vue-app && rm -rf node_modules dist
```
