# @luhanxin/md-parser-theme

> Default theme for `@luhanxin/md-parser-core` — CSS styles for markdown rendering.

## Install

```bash
pnpm add @luhanxin/md-parser-theme
```

## Usage

```ts
// 在应用入口导入
import '@luhanxin/md-parser-theme';
```

## What's Included

| Section | CSS Classes | Description |
|---------|------------|-------------|
| Markdown Body | `.markdown-body` | 主容器：标题/段落/代码/表格/链接等 |
| Mention | `.mention` | @用户提及 |
| Hashtag | `.hashtag` | #标签 |
| Container | `.custom-container`, `.container-title/icon/content` | tip/warning/info/danger 容器 |
| KaTeX | `.katex`, `.katex-display` | 数学公式 |
| Mermaid | `.mermaid-diagram/loading/error` | 图表渲染状态 |
| Code Block | `.code-block-wrapper/lang/copy` | 代码块包装器 |
| States | `.markdown-skeleton`, `.markdown-error` | 加载/错误状态 |

## Naming Convention

**All class names use kebab-case**, matching the HTML output from `@luhanxin/md-parser-core`.

## Custom Theme

Fork this package or override specific selectors:

```css
/* 覆盖容器配色 */
.custom-container.tip {
  background-color: #your-color;
  border-left-color: #your-accent;
}
```
