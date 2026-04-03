---
name: article-actions-style-refactor
overview: 调整 ArticleActions 组件的样式，适配新的 DOM 结构（count 在按钮外部），并将点赞/收藏的 active 状态颜色区分开：点赞激活态红色，收藏激活态浅灰色（类似掘金风格）。
todos:
  - id: update-styles-and-tsx
    content: 修改 articleActions.module.less 拆分点赞/收藏 active 配色并提升 .count 层级，同步更新 index.tsx 的 className
    status: completed
---

## 用户需求

调整 ArticleActions 侧边栏组件的样式，适配用户已修改的 DOM 结构，并优化点赞/收藏的 active 状态配色。

## 产品概述

文章详情页左侧浮动操作栏（点赞、收藏、编辑、返回），用户已将计数数字从按钮内部移到按钮外部（同级），需要样式跟随调整。

## 核心功能

- 适配新 DOM 结构：`.count` 已从 `.actionBtn` 内部移到外部（与 button 同级），样式嵌套需同步调整
- 点赞 active 态：红色图标 + 红色边框 + 浅红背景（类似掘金点赞风格）
- 收藏 active 态：深灰图标 + 浅灰边框 + 浅灰背景（类似掘金收藏风格，不上彩色）
- 数字显示在按钮正下方，居中小字体，按钮+数字为一组竖向排列
- TSX 中需给点赞和收藏的 active 态加不同 className 以区分颜色

## 技术栈

- React 18 + TypeScript
- CSS Modules (Less) + Tailwind @apply
- Ant Design Icons

## 实现方案

在 `index.tsx` 中为点赞和收藏按钮分别使用 `styles.activeLike` 和 `styles.activeFavorite` 两个不同的 active className，替代原来共用的 `styles.active`。在 `articleActions.module.less` 中：

1. 将 `.count` 从 `.actionBtn` 嵌套中提升到 `.actions` 层级，适配新的 DOM 结构
2. 新增 `.activeLike` 样式（红色系），替代点赞的 `.active`
3. 新增 `.activeFavorite` 样式（灰色系），替代收藏的 `.active`
4. 删除旧的共用 `.active` 样式

### 配色方案

**点赞 activeLike**：

- 默认态：`color: #f53f3f`，`border-color: #f53f3f`，`background: rgba(245, 63, 63, 0.06)`
- hover：`background: rgba(245, 63, 63, 0.1)`

**收藏 activeFavorite**（掘金风格浅灰）：

- 默认态：`color: var(--color-text-2)`（#515767），`border-color: var(--color-border)`（#e4e6eb），`background: var(--color-bg-hover)`（#f2f3f5）
- hover：`color: var(--color-text-1)`，`border-color: #c2c8d1`，`background: #e8e9ec`

## 实现备注

- 使用项目已有的 CSS 变量保持设计系统一致性
- `.count` 提升后需要确保 font-size、居中、间距与按钮视觉对齐
- 删除旧 `.active` 避免死代码残留

## 目录结构

```
apps/main/src/components/ArticleActions/
├── index.tsx                    # [MODIFY] 点赞 active 用 styles.activeLike，收藏用 styles.activeFavorite
└── articleActions.module.less   # [MODIFY] 重构 active 样式为两套配色；.count 提升到 .actions 层级
```