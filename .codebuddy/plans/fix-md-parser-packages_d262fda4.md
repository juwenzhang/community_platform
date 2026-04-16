---
name: fix-md-parser-packages
overview: 系统性修复 md-parser-core/react/vue 三个包及两个 demo 中存在的类名不一致、导出缺失、安全配置不一致、CSS 命名错误、README 过时等问题。
todos:
  - id: fix-react-components
    content: 修复 React 包：CustomContainer/CodeBlock 类名改为 kebab-case，index.ts 添加 MermaidDiagram 导出
    status: completed
  - id: fix-react-css
    content: React CSS 文件 markdown.module.css 重命名为 markdown.css，更新 tsup.config.ts 入口路径，修复响应式媒体查询类名，清理空 types 目录
    status: completed
  - id: fix-vue-components
    content: 修复 Vue 包：CustomContainer/CodeBlock 类名和 scoped CSS 改为 kebab-case，MermaidDiagram securityLevel 改为 strict
    status: completed
  - id: fix-readmes
    content: 更新 React/Vue 包 README，将 DOMPurify 描述替换为 rehype-sanitize + mermaid strict
    status: completed
  - id: verify-all
    content: 执行 pnpm run typecheck 和 pnpm run build 全量验证所有修复
    status: completed
    dependencies:
      - fix-react-components
      - fix-react-css
      - fix-vue-components
      - fix-readmes
---

## 用户需求

全面审查并修复 md-parser-core、md-parser-react、md-parser-vue 三个包及两个 demo 应用中的所有代码质量问题。

## 核心修复内容

### 高优先级

1. React 包 index.ts 缺少 MermaidDiagram 组件导出
2. React CustomContainer.tsx 组件类名与 Core 输出不一致（camelCase vs kebab-case）
3. React CodeBlock.tsx 组件类名与 Core 输出不一致
4. Vue MermaidDiagram.vue securityLevel 为 'loose'，应改为 'strict'
5. Vue CustomContainer.vue 和 CodeBlock.vue 类名与 Core 不一致

### 中优先级

6. React CSS 响应式媒体查询中 `.markdownBody` 应为 `.markdown-body`
7. CSS 文件名 `markdown.module.css` 误导，实际不作为 CSS Module 使用，应改为 `markdown.css`
8. React/Vue README 仍提及已移除的 DOMPurify

### 低优先级

9. React `src/types/` 空目录清理
10. 修复完成后执行全量 typecheck + build 验证

## 技术栈

- md-parser-core: tsup 构建，输出 kebab-case 类名（`custom-container`、`code-block-wrapper`）
- md-parser-react: tsup 构建，React 18，CSS 作为独立入口打包
- md-parser-vue: vite lib 模式构建，Vue 3 + scoped CSS
- demo: vite dev/build

## 实现方案

### 核心思路

Core 包的 `hast-handlers.ts` 和 `rehype-code-meta.ts` 定义了 HTML 输出的类名（kebab-case），是整个系统的**唯一真相源**。React 和 Vue 的独立组件（CustomContainer、CodeBlock）的类名必须与 Core 输出保持一致，这样：

1. CSS 样式能同时命中 `dangerouslySetInnerHTML/v-html` 渲染的 core 输出和独立组件
2. 用户自定义样式只需写一套选择器

### 修复策略

- **React 独立组件**：将 className 从 camelCase 改为 kebab-case，与 Core 和已修改的 CSS 文件保持一致
- **Vue 独立组件**：同样修改模板和 scoped CSS 中的类名为 kebab-case
- **CSS 文件重命名**：`markdown.module.css` → `markdown.css`，同步更新 tsup.config.ts 入口路径
- **securityLevel 统一**：Vue MermaidDiagram 从 `'loose'` 改为 `'strict'`

## 实现注意事项

- CSS 文件重命名后必须更新 `tsup.config.ts` 中的入口路径
- Vue scoped CSS 的类名修改需同时修改 `<template>` 和 `<style scoped>` 两处
- README 中 DOMPurify 的描述需替换为实际使用的安全机制（rehype-sanitize + mermaid securityLevel:strict）
- 修复完成后执行 `pnpm run typecheck` 和 `pnpm run build` 全量验证

## 目录结构

```
packages/md-parser-react/
├── src/
│   ├── index.ts                           # [MODIFY] 添加 MermaidDiagram 导出
│   ├── components/
│   │   ├── CustomContainer.tsx            # [MODIFY] 类名 camelCase → kebab-case
│   │   └── CodeBlock.tsx                  # [MODIFY] 类名 camelCase → kebab-case
│   ├── styles/
│   │   └── markdown.module.css → markdown.css  # [RENAME] 去掉 .module 后缀
│   └── types/                             # [DELETE] 空目录
├── tsup.config.ts                         # [MODIFY] CSS 入口路径更新
└── README.md                              # [MODIFY] DOMPurify 描述修正

packages/md-parser-vue/
├── src/
│   ├── components/
│   │   ├── CustomContainer.vue            # [MODIFY] 类名 + scoped CSS kebab-case
│   │   ├── CodeBlock.vue                  # [MODIFY] 类名 + scoped CSS kebab-case
│   │   └── MermaidDiagram.vue             # [MODIFY] securityLevel: 'loose' → 'strict'
└── README.md                              # [MODIFY] DOMPurify 描述修正
```