# Custom Syntax Guide

> @luhanxin/md-parser-core supports custom Markdown syntax extensions

## @Mentions

### Syntax

```markdown
Hello @alice and @bob!
```

### Output

```html
<a href="/user/alice" class="mention" data-username="alice">@alice</a>
```

### Rules

- Must start with `@` followed by username
- Username can contain: letters, numbers, underscores, Chinese characters
- Won't match email addresses (e.g., `user@example.com`)
- Must be preceded by non-alphanumeric character or start of line

### Examples

✅ **Works:**
```markdown
Thanks @alice!
Hey @张三
@bob is awesome
```

❌ **Won't match:**
```markdown
user@example.com
test@localhost
```

### Styling

```css
.mention {
  color: #1e80ff;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.mention:hover {
  text-decoration: underline;
}
```

---

## #Hashtags

### Syntax

```markdown
This is about #javascript and #vue
```

### Output

```html
<a href="/tag/javascript" class="hashtag" data-tag="javascript">#javascript</a>
```

### Rules

- Must start with `#` followed by tag name
- Tag name can contain: letters, numbers, underscores, Chinese characters
- Won't conflict with Markdown headings (headings must have space after `#`)
- Must be preceded by non-alphanumeric character or start of line

### Examples

✅ **Works:**
```markdown
Learn #vue3 today
Tags: #前端 #JavaScript
#TypeScript is great
```

❌ **Won't match:**
```markdown
# Heading (this is a heading)
color: #fff (this is just a hash)
```

### Styling

```css
.hashtag {
  color: #1e80ff;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.hashtag:hover {
  text-decoration: underline;
}
```

---

## :::Containers

### Syntax

Four container types: `tip`, `warning`, `info`, `danger`

```markdown
:::tip
This is a tip.
:::

:::warning Custom Title
This is a warning with custom title.
:::

:::info
Information message.
:::

:::danger
Danger zone!
:::
```

### Output

```html
<div class="custom-container tip">
  <div class="custom-container-title">
    <span class="custom-container-icon">💡</span>
    <span>提示</span>
  </div>
  <div class="custom-container-content">
    <p>This is a tip.</p>
  </div>
</div>
```

### Rules

- Must start with `:::type` on its own line
- Type must be one of: `tip`, `warning`, `info`, `danger`
- Optional title after type: `:::type Custom Title`
- Must end with `:::` on its own line
- Content can be multi-line and include other Markdown

### Default Titles

| Type   | Default Title | Icon |
|--------|---------------|------|
| tip    | 提示          | 💡   |
| warning| 警告          | ⚠️   |
| info   | 信息          | ℹ️   |
| danger | 危险          | 🚫   |

### Examples

**Basic:**
```markdown
:::tip
Use TypeScript for better type safety.
:::
```

**Custom Title:**
```markdown
:::warning Performance Warning
Large lists should use virtualization.
:::
```

**Nested Markdown:**
```markdown
:::info Code Example
```javascript
console.log('Hello World');
```
:::
```

**Multi-line:**
```markdown
:::danger Security Alert
- Never expose API keys
- Use environment variables
- Rotate keys regularly
:::
```

### Styling

```css
.custom-container {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.custom-container-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Tip */
.custom-container.tip {
  background-color: #e8f3ff;
  border-left: 4px solid #1e80ff;
}

.custom-container.tip .custom-container-title {
  color: #1e3a8a;
}

/* Warning */
.custom-container.warning {
  background-color: #fff8e6;
  border-left: 4px solid #f59e0b;
}

.custom-container.warning .custom-container-title {
  color: #92400e;
}

/* Info */
.custom-container.info {
  background-color: #f0f9ff;
  border-left: 4px solid #0ea5e9;
}

.custom-container.info .custom-container-title {
  color: #0c4a6e;
}

/* Danger */
.custom-container.danger {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.custom-container.danger .custom-container-title {
  color: #991b1b;
}
```

---

## Complete Example

```markdown
---
title: Getting Started with Vue 3
author: Alice
tags: [vue, javascript, frontend]
---

# Getting Started with Vue 3

Hey @bob! Let's learn #vue3 together.

## Introduction

Vue 3 is amazing! Check out the official docs.

:::tip Pro Tip
Use `<script setup>` for cleaner code.
:::

## Setup

```bash
pnpm create vue@latest
```

:::warning TypeScript Required
We recommend using TypeScript for better DX.
:::

## Features

- Composition API
- Better TypeScript support
- Improved performance

:::info Learning Resources
- Official Docs
- Vue Mastery
- Vue School
:::

## Conclusion

Thanks for reading! Follow @alice for more #vue content.

:::danger Deprecation Notice
Vue 2 will reach EOL on Dec 31, 2023.
:::
```

Rendered output will include:
- Metadata extracted from frontmatter
- @mention link for `@alice` and `@bob`
- #hashtag link for `#vue3` and `#vue`
- Four styled containers (tip, warning, info, danger)
- Syntax highlighted code block
