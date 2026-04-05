---
name: markdown-parser-package-overhaul
overview: 对 GLM 实现的 md-parser 三包进行全面重构：修复架构偏离 Spec、插件 Bug、缺失 Worker 架构；新增事件代理、标题锚点/滚动感知、渲染后处理器、组件映射、全局 Provider、错误边界；新增渲染引擎分级自动切换（DOM → 虚拟列表 → Canvas → WebGL/WebGPU）、解析缓存层、增量解析、防抖节流。
---

## 用户需求

对 GLM 生成的 `md-parser-core`、`md-parser-react`、`md-parser-vue` 和 `demo/` 进行全面重构，修复架构偏离 OpenSpec 设计文档的问题、所有实现 Bug、代码质量问题。同时补齐企业级能力：事件代理、滚动感知、标题锚点、渲染后处理、组件映射、全局 Provider、错误边界。更重要的是新增渲染引擎分级架构（DOM / 虚拟列表 / Canvas / WebGL-WebGPU 四级自动切换）和性能优化层（解析缓存、增量解析、防抖节流）。

## 产品概述

Luhanxin Community Platform 的统一 Markdown 解析渲染方案，五层架构：

- 解析层: unified 生态 pipeline + 自定义语法插件 + Worker 卸载
- 提取层: TOC / 元数据 / 纯文本 一次 pipeline 完成
- 渲染后处理层: rehype 插件（标题锚点、外链处理、图片懒加载、代码块增强）
- 渲染引擎层: 四级自动切换 DOM / 虚拟列表 / Canvas / WebGL-WebGPU
- 性能优化层: LRU 解析缓存 + 增量解析 + 防抖节流 + Worker 消息去重

## 核心特性

- 修复三个自定义语法插件的 className/class Bug 和设计冲突
- 修复 Container 插件多行内容解析失败
- 修复 Vue emit 返回值误用和 onMounted 清理 Bug
- 消除双重解析（renderMarkdown + parseMarkdownToAst），统一为 ParseResult
- 实现 Spec Decision 2 的 WASM Worker 架构
- 四个 rehype 渲染后处理插件：heading-ids / external-links / lazy-images / code-meta
- 事件代理系统：@mention / #hashtag / 图片 / 链接 / 代码复制 的点击捕获
- 滚动感知：IntersectionObserver 追踪当前可视标题，TOC 高亮跟随
- 组件映射系统：用户可自定义 mention / codeBlock / image 的渲染组件
- 全局 Provider：React Context / Vue provide-inject 统一主题/事件/组件配置
- 错误边界：Mermaid/Shiki 出错时 fallback 而非整组件 crash
- 渲染引擎四级分级：DOM / 虚拟列表 / Canvas / WebGL-WebGPU 基于文档复杂度自动切换
- LRU 解析缓存 + content hash 命中跳过 pipeline
- 增量解析：行级 diff 检测变化区域，只重解析变化 block
- 防抖节流：useMarkdown 内置 debounce，Worker 消息去重，渲染节流
- 只读选区感知：选中文字可获取对应内容用于引用回复
- 移除 React 包中违反 Spec Non-goals 的图片上传/水印编辑器功能
- React 组件目录化 + CSS Module 修复
- Vue 巨型组件拆分 + scoped 样式嵌套化
- Demo 改善：TOC 侧边栏 + 滚动高亮 + 事件回调 + 渲染引擎切换面板 + 大文档性能测试

## 技术栈

- md-parser-core: TypeScript + unified (remark/rehype) + shiki + Web Worker API + Canvas 2D API + WebGL/WebGPU API
- md-parser-react: React 18 + TypeScript + CSS Modules (.module.less) + Tailwind @apply
- md-parser-vue: Vue 3 + TypeScript + scoped CSS (嵌套结构)
- 构建: tsup (core/react), vite lib mode (vue)
- 测试: vitest
- 代码规范: Biome

## 实现方案

### 1. 插件系统修复 -- mdast 节点 + hast-handlers

当前三个插件（mention/hashtag/container）直接在 remark 阶段把自定义节点转为 HTML 字符串，且使用了错误的 `className`（JSX 属性名）而非 `class`（HTML 属性名）。同时 render.ts 中又有 `rehypeCustomNodes()` 尝试处理自定义节点 -- 但节点已被提前转为 HTML，形成死代码。Container 插件只匹配单段落内的文本，多行容器内容解析失败。

**方案**: remark 插件只负责产出自定义 mdast 节点（MentionNode, HashtagNode, ContainerNode），不做任何 HTML 转换。通过 `remark-rehype` 的 `handlers` 选项注册 `hast-handlers.ts`，在 mdast->hast 转换阶段统一处理自定义节点到标准 hast 元素的映射（使用正确的 `class` 属性）。Container 插件重写为遍历 AST 节点序列匹配 `:::` 开闭标记，支持多行/嵌套内容。

### 2. rehype 渲染后处理插件

GLM 完全遗漏了渲染后处理。新增四个 rehype 插件：

- **rehype-heading-ids**: 给 h1-h6 注入 `id` 属性（从文本生成 slug）和锚点链接 ``，使 TOC 页内跳转生效
- **rehype-external-links**: 检测 `href` 是否为外链（非当前域名），自动添加 `target="_blank" rel="noopener noreferrer"` 和外链图标 class
- **rehype-lazy-images**: 给 `