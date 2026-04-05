---
name: fix-md-parser-build-errors
overview: 修复 `pnpm run build` 中所有构建错误，涵盖 md-parser-react 路径错误、CodeBlock dompurify 依赖、Vue demo 模板字符串转义问题、缺失的 env.d.ts、以及未使用导入清理。
todos:
  - id: fix-react-renderer-imports
    content: 修复 md-parser-react MarkdownRenderer.tsx 的 3 个错误相对路径（../ 改为 ./），移除 CodeBlock.tsx 的 dompurify 依赖
    status: completed
  - id: cleanup-unused-imports
    content: 清理所有包的未使用导入：React MarkdownProvider/useActiveHeading/ErrorBoundary，Vue MarkdownProvider
    status: completed
  - id: fix-vue-demo-template
    content: 修复 demo/vue-app App.vue 模板字符串反引号转义，清理 demo/react-app App.tsx 未使用的 useMarkdown 导入
    status: completed
  - id: verify-build
    content: 执行 pnpm run build 验证所有包构建通过
    status: completed
    dependencies:
      - fix-react-renderer-imports
      - cleanup-unused-imports
      - fix-vue-demo-template
---

## 用户需求

修复 `pnpm run build` 的全部构建错误，使项目能够完整通过编译。

## 产品概述

当前 md-parser 三个包（core/react/vue）和两个 demo 应用在执行 `pnpm run build` 时存在多处构建阻断错误，需要逐一修复。

## 核心问题

1. **md-parser-react 路径错误**: `MarkdownRenderer.tsx` 使用 `../context/` 和 `../hooks/` 引用同级目录，应为 `./context/` 和 `./hooks/`
2. **md-parser-react CodeBlock 冗余依赖**: `CodeBlock.tsx` 引入了 `dompurify`，但未声明依赖且 core 已内置 rehype-sanitize，属于冗余二次清理
3. **demo/vue-app 模板字符串转义**: `App.vue` 中反引号被错误转义为 `\`` 导致 JS 语法解析失败
4. **多处未使用导入**: React/Vue 包和 demo 中存在未使用的 import（`RenderLevel`、`useCallback`、`React`、`useMarkdown` 等）
5. **demo/react-app 隐式 any**: EventHandlers 回调参数隐式 any，是上游包未构建的连锁反应

## 技术栈

- 前端构建: tsup (md-parser-react) / vite lib mode (md-parser-vue) / vite (demo apps)
- TypeScript: strict mode, bundler moduleResolution
- 包管理: pnpm workspace, workspace:* 引用

## 实现方案

修复策略按构建依赖链从上游到下游逐步修复:

```
md-parser-core (已通过) 
  -> md-parser-react (修复路径 + 移除 dompurify + 清理未使用导入)
    -> demo/react-app (清理未使用导入)
  -> md-parser-vue (清理未使用导入)
    -> demo/vue-app (修复模板字符串转义)
```

### 关键技术决策

**CodeBlock.tsx 的 DOMPurify 处理 -- 选择移除而非保留**:

- md-parser-core 已内置 `rehype-sanitize` 做完整的 XSS 防护，Shiki 高亮输出在 pipeline 中已经过 sanitize
- CodeBlock 组件接收的 `highlightedHtml` 来自 core 渲染结果，已是安全 HTML
- 移除 DOMPurify 可以减少包体积 + 消除对额外依赖的需求
- 移除后直接使用 `highlightedHtml` 赋值给 `dangerouslySetInnerHTML`

## 实现细节

### 1. md-parser-react/src/MarkdownRenderer.tsx -- 路径修复

- `../context/MarkdownProvider` -> `./context/MarkdownProvider`
- `../hooks/useEventDelegation` -> `./hooks/useEventDelegation`
- `../hooks/useMarkdown` -> `./hooks/useMarkdown`

### 2. md-parser-react/src/components/CodeBlock.tsx -- 移除 dompurify

- 删除 `import DOMPurify from 'dompurify'`
- 删除 `useMemo` 中的 `DOMPurify.sanitize()` 调用
- 直接使用 `highlightedHtml` 传入 `dangerouslySetInnerHTML`
- 若仍需 `useMemo`（无需，因为 `highlightedHtml` 本身已是 prop），可简化为直接使用

### 3. md-parser-react/src/context/MarkdownProvider.tsx -- 清理导入

- 移除未使用的 `RenderLevel` 类型导入

### 4. md-parser-react/src/hooks/useActiveHeading.ts -- 清理导入

- 移除未使用的 `useCallback`

### 5. md-parser-react/src/components/MarkdownErrorBoundary.tsx -- 清理导入

- `import React, { Component, ... }` -> `import { Component, ... }`（react-jsx transform 不需要显式 React 导入）

### 6. md-parser-vue/src/context/MarkdownProvider.ts -- 清理导入

- 移除未使用的 `RenderLevel` 类型导入

### 7. demo/vue-app/src/App.vue -- 模板字符串转义修复

- 将所有 `\`` 还原为正常反引号
- 将所有 `\${` 还原为正常 `${` 模板插值
- 移除未使用的 `computed` 导入

### 8. demo/react-app/src/App.tsx -- 清理导入

- 移除未使用的 `useMarkdown` 导入
- EventHandlers 回调参数的隐式 any 会在上游 md-parser-react 修复后自动解决

## 目录结构

```
packages/
├── md-parser-react/src/
│   ├── MarkdownRenderer.tsx              # [MODIFY] 修复 3 个 import 路径 ../->./
│   ├── components/
│   │   ├── CodeBlock.tsx                 # [MODIFY] 移除 dompurify，简化 sanitize 逻辑
│   │   └── MarkdownErrorBoundary.tsx     # [MODIFY] 移除未使用的 React 导入
│   ├── context/
│   │   └── MarkdownProvider.tsx          # [MODIFY] 移除未使用的 RenderLevel 导入
│   └── hooks/
│       └── useActiveHeading.ts           # [MODIFY] 移除未使用的 useCallback 导入
├── md-parser-vue/src/
│   └── context/
│       └── MarkdownProvider.ts           # [MODIFY] 移除未使用的 RenderLevel 导入
demo/
├── react-app/src/
│   └── App.tsx                           # [MODIFY] 移除未使用的 useMarkdown 导入
└── vue-app/src/
    └── App.vue                           # [MODIFY] 修复模板字符串反引号转义
```